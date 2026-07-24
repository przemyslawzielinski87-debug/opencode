export * as ModelRouteAttestation from "./model-route-attestation"

import { Schema } from "effect"
import { define } from "../event"
import { SessionID } from "../session-id"

export const IdentityLevel = Schema.Union([
  Schema.Literal("PROVIDER_CONFIRMED"),
  Schema.Literal("ADAPTER_CONFIRMED"),
  Schema.Literal("REQUEST_ONLY"),
  Schema.Literal("MISMATCH_DETECTED"),
]).annotate({ identifier: "ModelRouteAttestation.IdentityLevel" })
export type IdentityLevel = typeof IdentityLevel.Type

export const ReasonCode = Schema.Union([
  Schema.Literal("PROVIDER_UNAVAILABLE"),
  Schema.Literal("MODEL_UNAVAILABLE"),
  Schema.Literal("RATE_LIMIT"),
  Schema.Literal("TIMEOUT"),
  Schema.Literal("AUTH_FAILURE"),
  Schema.Literal("CONTEXT_LIMIT"),
  Schema.Literal("POLICY_ROUTING"),
  Schema.Literal("OPERATOR_OVERRIDE"),
]).annotate({ identifier: "ModelRouteAttestation.ReasonCode" })
export type ReasonCode = typeof ReasonCode.Type

const MessageID = Schema.String.check(Schema.isStartsWith("msg_")).pipe(Schema.brand("MessageID"))
const RunID = Schema.String.check(Schema.isStartsWith("run_")).pipe(Schema.brand("RunID"))
const Route = Schema.String
const ProviderID = Schema.String
const ModelID = Schema.String
const Timestamp = Schema.String.check(
  Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
)
const AttestationSha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/))

const RequestedRoute = Schema.Struct({
  provider_id: ProviderID,
  model_id: ModelID,
  route: Route,
}).annotate({ identifier: "ModelRouteAttestation.RequestedRoute" })

const ExecutedRoute = Schema.Struct({
  provider_id: ProviderID,
  model_id: ModelID,
  route: Route,
  adapter_id: ProviderID,
  runtime_id: Schema.Union([Schema.Literal("native"), Schema.Literal("ai-sdk")]),
}).annotate({ identifier: "ModelRouteAttestation.ExecutedRoute" })

const ObservedIdentity = Schema.Struct({
  provider_id: Schema.NullOr(ProviderID),
  model_id: Schema.NullOr(ModelID),
  provider_request_id: Schema.NullOr(Schema.String),
}).annotate({ identifier: "ModelRouteAttestation.ObservedIdentity" })

const Fallback = Schema.Struct({
  used: Schema.Boolean,
  from_route: Schema.NullOr(Route),
  to_route: Schema.NullOr(Route),
  reason_code: Schema.NullOr(ReasonCode),
}).annotate({ identifier: "ModelRouteAttestation.Fallback" })

const Identity = Schema.Struct({
  level: IdentityLevel,
  route_identity_proven: Schema.Boolean,
  model_identity_proven: Schema.Boolean,
  silent_fallback_detected: Schema.Boolean,
}).annotate({ identifier: "ModelRouteAttestation.Identity" })

export const Payload = Schema.Struct({
  type: Schema.Literal("model.route.attestation"),
  version: Schema.Literal(1),
  session_id: SessionID,
  run_id: RunID,
  message_id: MessageID,
  timestamp_utc: Timestamp,
  requested: RequestedRoute,
  executed: ExecutedRoute,
  observed: ObservedIdentity,
  fallback: Fallback,
  identity: Identity,
  attestation_sha256: AttestationSha256,
}).annotate({ identifier: "ModelRouteAttestation.Payload" })
export type Payload = typeof Payload.Type

export const Event = define({
  type: "model.route.attestation",
  durable: { aggregate: "session_id", version: 1 },
  schema: {
    type: Schema.Literal("model.route.attestation"),
    version: Schema.Literal(1),
    session_id: SessionID,
    run_id: RunID,
    message_id: MessageID,
    timestamp_utc: Timestamp,
    requested: RequestedRoute,
    executed: ExecutedRoute,
    observed: ObservedIdentity,
    fallback: Fallback,
    identity: Identity,
    attestation_sha256: AttestationSha256,
  },
})

export type ObservedInput = {
  readonly provider_id?: string | null
  readonly model_id?: string | null
  readonly provider_request_id?: string | null
}

export type FallbackInput = {
  readonly used: boolean
  readonly from_route?: string | null
  readonly to_route?: string | null
  readonly reason_code?: string | null
}

export type RequestedInput = {
  readonly provider_id: string
  readonly model_id: string
  readonly route?: string
}

export type ExecutedInput = {
  readonly provider_id: string
  readonly model_id: string
  readonly route?: string
  readonly adapter_id?: string
  readonly runtime_id: "native" | "ai-sdk"
}

export type ClassifyInput = {
  readonly requested: RequestedInput
  readonly executed?: ExecutedInput
  readonly observed?: ObservedInput
  readonly fallback: FallbackInput
}

export function classify(input: ClassifyInput): {
  readonly level: IdentityLevel
  readonly route_identity_proven: boolean
  readonly model_identity_proven: boolean
  readonly silent_fallback_detected: boolean
} {
  const requestedRoute = routeOf(input.requested)
  if (!input.executed) {
    return {
      level: "REQUEST_ONLY",
      route_identity_proven: false,
      model_identity_proven: false,
      silent_fallback_detected: false,
    }
  }

  const executedRoute = routeOf(input.executed)

  if (input.fallback.used) {
    if (
      input.fallback.from_route == null ||
      input.fallback.to_route == null ||
      input.fallback.reason_code == null ||
      !Schema.is(ReasonCode)(input.fallback.reason_code)
    ) {
      throw new Error("Invalid fallback: used=true requires from_route, to_route, and a valid reason_code")
    }

    const observed = normalizeObserved(input.observed)
    if (observed.provider_id != null && observed.model_id != null) {
      if (observed.provider_id === input.executed.provider_id && observed.model_id === input.executed.model_id) {
        return {
          level: "PROVIDER_CONFIRMED",
          route_identity_proven: true,
          model_identity_proven: true,
          silent_fallback_detected: false,
        }
      }
      return {
        level: "MISMATCH_DETECTED",
        route_identity_proven: false,
        model_identity_proven: false,
        silent_fallback_detected: false,
      }
    }

    return {
      level: "ADAPTER_CONFIRMED",
      route_identity_proven: true,
      model_identity_proven: false,
      silent_fallback_detected: false,
    }
  }

  if (requestedRoute !== executedRoute) {
    return {
      level: "MISMATCH_DETECTED",
      route_identity_proven: false,
      model_identity_proven: false,
      silent_fallback_detected: true,
    }
  }

  const observed = normalizeObserved(input.observed)
  if (observed.provider_id != null && observed.model_id != null) {
    if (observed.provider_id === input.executed.provider_id && observed.model_id === input.executed.model_id) {
      return {
        level: "PROVIDER_CONFIRMED",
        route_identity_proven: true,
        model_identity_proven: true,
        silent_fallback_detected: false,
      }
    }
    return {
      level: "MISMATCH_DETECTED",
      route_identity_proven: false,
      model_identity_proven: false,
      silent_fallback_detected: true,
    }
  }

  return {
    level: "ADAPTER_CONFIRMED",
    route_identity_proven: true,
    model_identity_proven: false,
    silent_fallback_detected: false,
  }
}

const routeOf = (input: { provider_id: string; model_id: string; route?: string }) =>
  input.route ?? `${input.provider_id}/${input.model_id}`

const normalizeObserved = (observed?: ObservedInput): { provider_id: string | null; model_id: string | null } => ({
  provider_id: observed?.provider_id ?? null,
  model_id: observed?.model_id ?? null,
})

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const sortKeys = (value: unknown): unknown => {
  if (value === null) return null
  if (Array.isArray(value)) return value.map(sortKeys)
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key])
    }
    return sorted
  }
  return value
}

export type HashFn = (canonical: string) => string

export function extractTrustedObservation(_metadata: unknown): {
  readonly provider_id: null
  readonly model_id: null
  readonly provider_request_id: null
} {
  return { provider_id: null, model_id: null, provider_request_id: null }
}

export type BuildInput = {
  readonly session_id: string
  readonly run_id: string
  readonly message_id: string
  readonly requested: RequestedInput
  readonly executed: ExecutedInput
  readonly observed?: ObservedInput
  readonly fallback?: FallbackInput
  readonly timestamp_utc?: string
}

export function buildAttestation(input: BuildInput, hash: HashFn): Payload {
  const requested = {
    provider_id: input.requested.provider_id,
    model_id: input.requested.model_id,
    route: routeOf(input.requested),
  }
  const executed = {
    provider_id: input.executed.provider_id,
    model_id: input.executed.model_id,
    route: routeOf(input.executed),
    adapter_id: input.executed.adapter_id ?? input.executed.provider_id,
    runtime_id: input.executed.runtime_id,
  }
  const fallback = {
    used: input.fallback?.used ?? false,
    from_route: input.fallback?.from_route ?? null,
    to_route: input.fallback?.to_route ?? null,
    reason_code: input.fallback?.reason_code ?? null,
  }
  const observed = normalizeObservedToWire(input.observed)
  const identity = classify({ requested, executed, observed: input.observed, fallback })
  const timestamp_utc = input.timestamp_utc ?? isoTimestamp()
  const payloadWithoutHash = {
    type: "model.route.attestation" as const,
    version: 1 as const,
    session_id: input.session_id,
    run_id: input.run_id,
    message_id: input.message_id,
    timestamp_utc,
    requested,
    executed,
    observed,
    fallback,
    identity,
  }
  const attestation_sha256 = hash(canonicalize(payloadWithoutHash))
  return Schema.decodeUnknownSync(Payload)({ ...payloadWithoutHash, attestation_sha256 })
}

const normalizeObservedToWire = (observed?: ObservedInput) => ({
  provider_id: observed?.provider_id ?? null,
  model_id: observed?.model_id ?? null,
  provider_request_id: observed?.provider_request_id ?? null,
})

const isoTimestamp = () => {
  const now = new Date()
  const iso = now.toISOString()
  return iso.includes(".") ? iso : `${iso.slice(0, -1)}.000Z`
}
