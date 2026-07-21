import { Schema } from "effect"
import { ConfigV1 } from "./config"
import { ConfigMCPV1 } from "./mcp"
import { ConfigLSPV1 } from "./lsp"
import { ConfigPluginV1 } from "./plugin"
import { ConfigProviderV1 } from "./provider"

const KNOWN_PERMISSION_KEYS = [
  "read",
  "edit",
  "glob",
  "grep",
  "list",
  "bash",
  "task",
  "external_directory",
  "todowrite",
  "question",
  "webfetch",
  "websearch",
  "lsp",
  "doom_loop",
  "skill",
] as const

const PERMISSION_ACTIONS = ["ask", "allow", "deny"] as const

export type PublicModelSummary = {
  id: string
  name?: string
}

export const PublicModelSummarySchema = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String),
})

export type PublicProviderConfig = {
  name?: string
  npm?: string
  credentialConfigured: boolean
  models?: Record<string, PublicModelSummary>
}

export const PublicProviderConfigSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  npm: Schema.optional(Schema.String),
  credentialConfigured: Schema.Boolean,
  models: Schema.optional(Schema.Record(Schema.String, PublicModelSummarySchema)),
})

export type PublicMcpEntry = { enabled: boolean }

export const PublicMcpEntrySchema = Schema.Struct({
  enabled: Schema.Boolean,
})

export type PublicLspEntry = { enabled: boolean }

export const PublicLspEntrySchema = Schema.Struct({
  enabled: Schema.Boolean,
})

export const PublicLspSchema = Schema.Union([
  Schema.Boolean,
  Schema.Record(Schema.String, PublicLspEntrySchema),
])

export const PublicPluginSchema = Schema.String

export type PublicExperimental = {
  disable_paste_summary?: boolean
}

export const PublicExperimentalSchema = Schema.Struct({
  disable_paste_summary: Schema.optional(Schema.Boolean),
})

const PermissionActionSchema = Schema.Literals([...PERMISSION_ACTIONS])

export const PublicPermissionSchema = Schema.Struct({
  "*": Schema.optional(PermissionActionSchema),
  read: Schema.optional(PermissionActionSchema),
  edit: Schema.optional(PermissionActionSchema),
  glob: Schema.optional(PermissionActionSchema),
  grep: Schema.optional(PermissionActionSchema),
  list: Schema.optional(PermissionActionSchema),
  bash: Schema.optional(PermissionActionSchema),
  task: Schema.optional(PermissionActionSchema),
  external_directory: Schema.optional(PermissionActionSchema),
  todowrite: Schema.optional(PermissionActionSchema),
  question: Schema.optional(PermissionActionSchema),
  webfetch: Schema.optional(PermissionActionSchema),
  websearch: Schema.optional(PermissionActionSchema),
  lsp: Schema.optional(PermissionActionSchema),
  doom_loop: Schema.optional(PermissionActionSchema),
  skill: Schema.optional(PermissionActionSchema),
})

export type PublicPermission = Partial<
  Record<(typeof KNOWN_PERMISSION_KEYS)[number] | "*", "ask" | "allow" | "deny">
>

export type PublicConfig = {
  shell?: string
  share?: "manual" | "auto" | "disabled"
  model?: string
  disabled_providers?: string[]
  provider?: Record<string, PublicProviderConfig>
  mcp?: Record<string, PublicMcpEntry>
  lsp?: boolean | Record<string, PublicLspEntry>
  plugin?: string[]
  permission?: PublicPermission
  experimental?: PublicExperimental
}

// Closed schema: every key is explicitly declared. Unknown fields are not
// pass-through; callers must add new ones here before they can be projected.
export const PublicConfigSchema = Schema.Struct({
  shell: Schema.optional(Schema.String),
  share: Schema.optional(Schema.Literals(["manual", "auto", "disabled"])),
  model: Schema.optional(Schema.String),
  disabled_providers: Schema.optional(Schema.Array(Schema.String)),
  provider: Schema.optional(Schema.Record(Schema.String, PublicProviderConfigSchema)),
  mcp: Schema.optional(Schema.Record(Schema.String, PublicMcpEntrySchema)),
  lsp: Schema.optional(PublicLspSchema),
  plugin: Schema.optional(Schema.Array(PublicPluginSchema)),
  permission: Schema.optional(PublicPermissionSchema),
  experimental: Schema.optional(PublicExperimentalSchema),
})

function pickProviderConfig(
  input: ConfigProviderV1.Info | undefined,
  credentialConfigured: boolean,
): PublicProviderConfig | undefined {
  if (!input) return undefined
  const models: Record<string, PublicModelSummary> = {}
  if (input.models) {
    for (const [id, m] of Object.entries(input.models)) {
      if (!m) continue
      const summary: PublicModelSummary = { id }
      if (typeof m.name === "string") summary.name = m.name
      models[id] = summary
    }
  }
  const out: PublicProviderConfig = {
    credentialConfigured,
  }
  if (typeof input.name === "string") out.name = input.name
  if (typeof input.npm === "string") out.npm = input.npm
  if (Object.keys(models).length > 0) out.models = models
  return out
}

function pickMcpEntry(input: ConfigMCPV1.Info | { enabled: boolean }): PublicMcpEntry | undefined {
  if (!input) return undefined
  return { enabled: input.enabled !== false }
}

// LSP is reduced to a per-server enabled boolean: explicit `disabled: true` is
// not enabled, anything else with a command (or no explicit disabled flag) is
// enabled. We never surface the binary path or its env/init payloads.
function pickLspEntry(input: Schema.Schema.Type<typeof ConfigLSPV1.Entry>): { enabled: boolean } | undefined {
  if (!input) return undefined
  if ("disabled" in input && input.disabled === true) return { enabled: false }
  if ("command" in input && Array.isArray(input.command)) return { enabled: true }
  return undefined
}

function pickPlugin(spec: ConfigPluginV1.Spec): string | undefined {
  if (typeof spec === "string") return spec
  if (Array.isArray(spec) && spec.length >= 1 && typeof spec[0] === "string") return spec[0]
  return undefined
}

function isKnownPermissionAction(value: unknown): value is "ask" | "allow" | "deny" {
  return typeof value === "string" && (PERMISSION_ACTIONS as readonly string[]).includes(value)
}

// Reduce a single permission rule (scalar OR nested object map) to one of
// allow/ask/deny. deny wins over ask wins over allow; unknown scalars are
// dropped without copying keys.
function summarizeRule(rule: unknown): "ask" | "allow" | "deny" | undefined {
  if (isKnownPermissionAction(rule)) return rule
  if (rule && typeof rule === "object" && !Array.isArray(rule)) {
    const entries = Object.values(rule as Record<string, unknown>)
    if (entries.some((v) => v === "deny")) return "deny"
    if (entries.some((v) => v === "ask")) return "ask"
    if (entries.some((v) => v === "allow")) return "allow"
    return undefined
  }
  return undefined
}

// Closed permission filter: only KNOWN_PERMISSION_KEYS + "*" survive. Nested
// rule objects are collapsed to one scalar summary (no key/value copy).
function pickPermission(input: ConfigV1.Info["permission"]): PublicPermission | undefined {
  if (!input || typeof input !== "object") return undefined
  const out: PublicPermission = {}
  for (const key of KNOWN_PERMISSION_KEYS) {
    if (!(key in input)) continue
    const summary = summarizeRule((input as Record<string, unknown>)[key])
    if (summary) out[key] = summary
  }
  if ("*" in input) {
    const summary = summarizeRule((input as Record<string, unknown>)["*"])
    if (summary) out["*"] = summary
  }
  if (Object.keys(out).length === 0) return undefined
  return out
}

export interface PublicConfigOptions {
  credentialConfigured: (providerID: string) => boolean
}

export function toPublicConfig(input: ConfigV1.Info, options: PublicConfigOptions): PublicConfig {
  const out: PublicConfig = {}
  if (typeof input.shell === "string") out.shell = input.shell
  if (input.share) out.share = input.share
  if (typeof input.model === "string") out.model = input.model
  if (Array.isArray(input.disabled_providers)) out.disabled_providers = input.disabled_providers.slice()
  if (input.provider) {
    const provider: Record<string, PublicProviderConfig> = {}
    for (const [id, cfg] of Object.entries(input.provider)) {
      const picked = pickProviderConfig(cfg, options.credentialConfigured(id))
      if (picked) provider[id] = picked
    }
    if (Object.keys(provider).length > 0) out.provider = provider
  }
  if (input.mcp) {
    const mcp: Record<string, PublicMcpEntry> = {}
    for (const [id, cfg] of Object.entries(input.mcp)) {
      const picked = pickMcpEntry(cfg)
      if (picked) mcp[id] = picked
    }
    if (Object.keys(mcp).length > 0) out.mcp = mcp
  }
  if (input.lsp !== undefined) {
    if (typeof input.lsp === "boolean") {
      out.lsp = input.lsp
    } else if (input.lsp && typeof input.lsp === "object") {
      const lsp: Record<string, PublicLspEntry> = {}
      for (const [id, entry] of Object.entries(input.lsp)) {
        const picked = pickLspEntry(entry)
        if (picked) lsp[id] = picked
      }
      if (Object.keys(lsp).length > 0) out.lsp = lsp
    }
  }
  if (Array.isArray(input.plugin)) {
    const plugin = input.plugin.map(pickPlugin).filter((p): p is string => typeof p === "string")
    if (plugin.length > 0) out.plugin = plugin
  }
  const permission = pickPermission(input.permission)
  if (permission) out.permission = permission
  if (input.experimental) {
    const exp: PublicExperimental = {}
    if (typeof input.experimental.disable_paste_summary === "boolean") {
      exp.disable_paste_summary = input.experimental.disable_paste_summary
    }
    if (Object.keys(exp).length > 0) out.experimental = exp
  }
  return out
}

export const FORBIDDEN_PROPERTY_NAMES = [
  "apiKey",
  "api_key",
  "key",
  "token",
  "accessToken",
  "refreshToken",
  "PAT",
  "password",
  "secret",
  "clientSecret",
  "privateKey",
  "Authorization",
  "Cookie",
  "headers",
  "environment",
  "options",
  "request",
  "body",
  "initialization",
] as const

export function assertNoForbiddenPropertyNames(input: unknown, path: string[] = []): void {
  if (input === null || input === undefined) return
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      assertNoForbiddenPropertyNames(input[i], [...path, String(i)])
    }
    return
  }
  if (typeof input !== "object") return
  for (const [key, value] of Object.entries(input)) {
    if ((FORBIDDEN_PROPERTY_NAMES as readonly string[]).includes(key)) {
      throw new Error(`forbidden property name at ${[...path, key].join(".")}: ${key}`)
    }
    assertNoForbiddenPropertyNames(value, [...path, key])
  }
}

export { KNOWN_PERMISSION_KEYS }