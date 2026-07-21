import { NamedError } from "@opencode-ai/core/util/error"
import { ConfigErrorV1 } from "@opencode-ai/core/v1/config/error"
import { Cause, Effect } from "effect"
import { HttpRouter, HttpServerError, HttpServerRespondable, HttpServerResponse } from "effect/unstable/http"

const REASON_MESSAGE_LIMIT = 1024
const ISSUE_PATH_LIMIT = 32
const ISSUE_CLASS_LIMIT = 64

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  if (value.length <= REASON_MESSAGE_LIMIT) return value
  return value.slice(0, REASON_MESSAGE_LIMIT) + `… (${value.length - REASON_MESSAGE_LIMIT} more chars)`
}

function sanitizePath(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((segment): segment is string => typeof segment === "string")
    .map((segment) => segment.replace(/[\x00-\x1f\x7f]/g, ""))
    .filter((segment) => segment.length > 0)
    .slice(0, ISSUE_PATH_LIMIT)
}

function sanitizeIssue(issue: unknown): { message: string; path: string[] } | undefined {
  if (!issue || typeof issue !== "object") return undefined
  const raw = issue as Record<string, unknown>
  const path = sanitizePath(raw.path)
  const cls = sanitizeString(raw.code ?? raw._tag ?? raw.kind ?? raw.class)
  if (!cls && path.length === 0) return undefined
  return {
    message: cls && cls.length <= ISSUE_CLASS_LIMIT ? cls : "invalid_config_value",
    path,
  }
}

function sanitizeIssues(value: unknown): { message: string; path: string[] }[] {
  if (!Array.isArray(value)) return []
  const out: { message: string; path: string[] }[] = []
  for (const item of value) {
    const safe = sanitizeIssue(item)
    if (safe) out.push(safe)
  }
  return out
}

function sanitizeErrorData(data: Record<string, unknown>): Record<string, unknown> {
  // Allowlist only name/path/location/issue-class data. Drop any raw nested
  // object the upstream error might attach; we never echo message/cause/stack.
  const safe: Record<string, unknown> = {}
  if (typeof data.path === "string") safe.path = sanitizeString(data.path)
  if (Array.isArray(data.location)) safe.location = sanitizePath(data.location)
  if (data.issues !== undefined) safe.issues = sanitizeIssues(data.issues)
  if (typeof data.kind === "string") safe.kind = sanitizeString(data.kind)
  if (typeof data._tag === "string") safe._tag = sanitizeString(data._tag)
  return safe
}

function sanitizeConfigError(error: NamedError): { name: string; data: Record<string, unknown> } {
  const raw = error.toObject()
  const data = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : {}
  return { name: raw.name, data: sanitizeErrorData(data) }
}

function sanitizeJsonError(error: InstanceType<typeof ConfigErrorV1.JsonError>) {
  return sanitizeConfigError(error)
}

function sanitizeInvalidError(error: InstanceType<typeof ConfigErrorV1.InvalidError>) {
  return sanitizeConfigError(error)
}

function sanitizeFrontmatterError(error: InstanceType<typeof ConfigErrorV1.FrontmatterError>) {
  return sanitizeConfigError(error)
}

function sanitizeDirectoryTypoError(error: InstanceType<typeof ConfigErrorV1.DirectoryTypoError>) {
  const raw = error.toObject()
  const data = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : {}
  const safe: Record<string, unknown> = {}
  if (typeof data.path === "string") safe.path = sanitizeString(data.path)
  return { name: raw.name, data: safe }
}

function readSafeTag(error: unknown): string {
  if (error && typeof error === "object") {
    const tag = (error as { _tag?: unknown })._tag
    if (typeof tag === "string") return tag
    const name = (error as { name?: unknown }).name
    if (typeof name === "string") return name
  }
  return "UnknownError"
}

// Keep typed HttpApi failures on their declared error path; this boundary only replaces defect-only empty 500s.
export const errorLayer = HttpRouter.middleware<{ handles: unknown }>()((effect) =>
  effect.pipe(
    Effect.catchCause((cause) => {
      const defect = cause.reasons.filter(Cause.isDieReason).find((reason) => {
        if (HttpServerResponse.isHttpServerResponse(reason.defect)) return false
        if (HttpServerError.isHttpServerError(reason.defect)) return false
        if (HttpServerRespondable.isRespondable(reason.defect)) return false
        return true
      })
      if (!defect) return Effect.failCause(cause)

      const error = defect.defect
      if (ConfigErrorV1.JsonError.isInstance(error)) {
        return Effect.succeed(HttpServerResponse.jsonUnsafe(sanitizeJsonError(error), { status: 400 }))
      }
      if (
        ConfigErrorV1.InvalidError.isInstance(error) ||
        ConfigErrorV1.FrontmatterError.isInstance(error) ||
        ConfigErrorV1.DirectoryTypoError.isInstance(error)
      ) {
        const safe =
          ConfigErrorV1.InvalidError.isInstance(error)
            ? sanitizeInvalidError(error)
            : ConfigErrorV1.FrontmatterError.isInstance(error)
              ? sanitizeFrontmatterError(error)
              : sanitizeDirectoryTypoError(error)
        return Effect.succeed(HttpServerResponse.jsonUnsafe(safe, { status: 400 }))
      }

      const ref = `err_${crypto.randomUUID().slice(0, 8)}`

      // Generic 500: log only the ref and safe error type/tag. Never echo the
      // raw error message, stack, or serialized cause to logs/responses.
      const safeTag = readSafeTag(error)
      return Effect.logError("failed", { ref, error: { name: safeTag } }).pipe(
        Effect.as(
          HttpServerResponse.jsonUnsafe(
            new NamedError.Unknown({
              message: "Unexpected server error. Check server logs for details.",
              ref,
            }).toObject(),
            { status: 500 },
          ),
        ),
      )
    }),
  ),
).layer