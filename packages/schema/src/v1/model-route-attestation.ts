// PRZ-96 R2 — Model Route Attestation contract (schema-only stage).
// Browser-safe wire contract. No runtime dependencies. HashFn is injected.

export * as ModelRouteAttestationV1 from "./model-route-attestation"

import { Schema } from "effect"
import { define, inventory } from "../event"
import { optional, statics } from "../schema"
import { SessionID } from "../session-id"
import { ascending } from "../identifier"

// ---------------------------------------------------------------------------
// PRZ-85 R3 ACTIVE fallback reason codes (subset required by this event).
// F-MINOR-06: REFERENCE_ONLY entries (HL_TRANSITION_INITIAL_PROBE, RULE_FAMILY_FORM)
//   excluded from runtime values. Deprecated aliases (e.g.
//   FB_TIMEOUT_AFTER_DISPATCH_NO_SILENT_REDISPATCH, FB_RETRY_ANOMALY_DETECTED)
//   are normalized to canonical forms in PRZ-85 R3 and MUST NOT appear here.
// ---------------------------------------------------------------------------
export const FallbackReasonCode = Schema.Literals([
  "FB_PROVIDER_UNAVAILABLE",
  "FB_TIMEOUT_BEFORE_DISPATCH",
  "FB_TIMEOUT_AFTER_DISPATCH",
  "FB_QUOTA_EXHAUSTED",
  "FB_AUTH_FAILED",
  "FB_CONTEXT_TOO_LARGE",
  "FB_TOOL_INCOMPATIBLE",
  "FB_MODEL_DISABLED",
  "FB_LATENCY_BREACH",
  "FB_HEALTH_DEGRADATION",
  "FB_ROUTE_IDENTITY_UNVERIFIED",
  "FB_REVIEWER_INDEPENDENCE_VIOLATION",
  "FB_SAFETY_POLICY_REJECTION",
  "FB_COST_BUDGET_EXCEEDED",
  "FB_QUOTA_RESERVE_VIOLATION",
  "FB_HEALTH_FLAPPING",
  "FB_STREAM_INTERRUPTED",
  "FB_BROWSER_TOOL_FAILED",
  "FB_VALIDATION_DETERMINISTIC_FAILURE",
  "FB_OPERATOR_OVERRIDE_REVOKED",
]).annotate({ identifier: "RouteAttestationFallbackReasonCode" })
export type FallbackReasonCode = typeof FallbackReasonCode.Type

// ---------------------------------------------------------------------------
// Per-attempt correlation ID. One attempt == one failed or one successful
// provider execution. RUN_ID alone is ambiguous because the same mission can
// span multiple provider attempts; attempt_id is unique per call.
// ---------------------------------------------------------------------------
export const AttemptID = Schema.String.check(
  Schema.isStartsWith("att_"),
  Schema.isPattern(/^att_[A-Za-z0-9_-]{4,80}$/),
).pipe(
  Schema.brand("ModelRouteAttemptID"),
  statics((schema) => ({
    create: () => schema.make("att_" + ascending()),
  })),
)
export type AttemptID = typeof AttemptID.Type

// MessageID — defined locally to avoid circular import with session.ts.
// Wire format is identical to SessionV1.MessageID (branded "msg" prefix).
export const MessageID = Schema.String.check(Schema.isStartsWith("msg")).pipe(
  Schema.brand("MessageID"),
  statics((schema) => ({ ascending: (id?: string) => schema.make(id ?? "msg_" + ascending()) })),
)
export type MessageID = typeof MessageID.Type

// ---------------------------------------------------------------------------
// Identity shapes. Requested is what the caller asked for; Executed is what
// the adapter actually invoked. They are NEVER proof of provider identity
// (RD_L03_REQUESTED_IS_NOT_PROOF). Only provider-evidence class (PRZ-97)
// can elevate state to PROVIDER_CONFIRMED.
// ---------------------------------------------------------------------------
export interface RequestedIdentity extends Schema.Schema.Type<typeof RequestedIdentity> {}
export const RequestedIdentity = Schema.Struct({
  providerFamily: Schema.String,
  modelID: Schema.String,
}).annotate({ identifier: "RouteAttestationRequestedIdentity" })

export interface ExecutedIdentity extends Schema.Schema.Type<typeof ExecutedIdentity> {}
export const ExecutedIdentity = Schema.Struct({
  providerFamily: Schema.String,
  modelID: Schema.String,
}).annotate({ identifier: "RouteAttestationExecutedIdentity" })

// Observed identity is the minimal witness from the trusted adapter boundary.
// Endpoint URLs and raw metadata are NOT persisted (PERSONAL_DATA / SECRET_SCAN).
export interface ObservedIdentity extends Schema.Schema.Type<typeof ObservedIdentity> {}
export const ObservedIdentity = Schema.Struct({
  providerFamily: Schema.String,
}).annotate({ identifier: "RouteAttestationObservedIdentity" })

// ---------------------------------------------------------------------------
// Observation status. UNAVAILABLE is explicit (not silently null) so
// downstream consumers can distinguish "no observation possible" from
// "observation present and inconclusive".
// ---------------------------------------------------------------------------
export const ObservationStatus = Schema.Literals([
  "AVAILABLE",
  "UNAVAILABLE",
  "PARTIAL",
  "INCONCLUSIVE",
]).annotate({ identifier: "RouteAttestationObservationStatus" })
export type ObservationStatus = typeof ObservationStatus.Type

export interface Observation extends Schema.Schema.Type<typeof Observation> {}
export const Observation = Schema.Struct({
  status: ObservationStatus,
  observed: optional(ObservedIdentity),
  observationSource: optional(Schema.String),
}).annotate({ identifier: "RouteAttestationObservation" })

// ---------------------------------------------------------------------------
// Identity / confidence result. The closed set is the contract.
// ---------------------------------------------------------------------------
export const IdentityResult = Schema.Literals([
  "REQUEST_ONLY",
  "ADAPTER_CONFIRMED",
  "PROVIDER_CONFIRMED",
  "MISMATCH_DETECTED",
  "OBSERVATION_UNAVAILABLE",
]).annotate({ identifier: "RouteAttestationIdentityResult" })
export type IdentityResult = typeof IdentityResult.Type

export const Confidence = Schema.Literals([
  "UNPROVEN",
  "ADAPTER_PROVEN",
  "PROVIDER_PROVEN",
  "REJECTED",
  "UNAVAILABLE",
]).annotate({ identifier: "RouteAttestationConfidence" })
export type Confidence = typeof Confidence.Type

// ---------------------------------------------------------------------------
// Provider-evidence class. Reserved for PRZ-97 runtime. The schema defines
// the contract; the runtime emission is deferred.
// ---------------------------------------------------------------------------
export const ProviderEvidenceClass = Schema.Literals([
  "PRZ79_ADAPTER_PROVIDER_PROOF",
]).annotate({ identifier: "RouteAttestationProviderEvidenceClass" })
export type ProviderEvidenceClass = typeof ProviderEvidenceClass.Type

export interface ProviderEvidence extends Schema.Schema.Type<typeof ProviderEvidence> {}
export const ProviderEvidence = Schema.Struct({
  class: ProviderEvidenceClass,
}).annotate({ identifier: "RouteAttestationProviderEvidence" })

// ---------------------------------------------------------------------------
// Silent fallback detection. EXPLICIT — never inferred from null fields.
// ---------------------------------------------------------------------------
export interface SilentFallback extends Schema.Schema.Type<typeof SilentFallback> {}
export const SilentFallback = Schema.Struct({
  detected: Schema.Boolean,
  reason: Schema.String,
}).annotate({ identifier: "RouteAttestationSilentFallback" })

// ---------------------------------------------------------------------------
// Fallback declaration. Equality constraints are enforced by validatePayload.
// used=false ⇒ all other fields MUST be undefined. used=true ⇒ from/to must
// match requested/executed and reason_code must be in the allowlist.
// ---------------------------------------------------------------------------
export interface Fallback extends Schema.Schema.Type<typeof Fallback> {}
export const Fallback = Schema.Struct({
  used: Schema.Boolean,
  fromRoute: optional(Schema.String),
  toRoute: optional(Schema.String),
  reasonCode: optional(FallbackReasonCode),
}).annotate({ identifier: "RouteAttestationFallback" })

// ---------------------------------------------------------------------------
// Schema version. Bump on breaking changes; old versions remain decodable.
// ---------------------------------------------------------------------------
export const SchemaVersion = Schema.Literal("1.0.0").annotate({
  identifier: "RouteAttestationSchemaVersion",
})
export type SchemaVersion = typeof SchemaVersion.Type

// ---------------------------------------------------------------------------
// Canonical JSON serializer. Stable key ordering, arrays preserve order.
// Used for the integrity digest so identical semantic payloads produce
// identical digests regardless of property insertion order.
// ---------------------------------------------------------------------------
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [key: string]: JsonValue }

export const canonicalize = (value: JsonValue): string => {
  if (value === null) return "null"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalize: non-finite number")
    return JSON.stringify(value)
  }
  if (typeof value === "string") return JSON.stringify(value)
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalize(v as JsonValue)).join(",") + "]"
  }
  if (typeof value === "object") {
    const obj = value as Record<string, JsonValue | undefined>
    const keys = Object.keys(obj).sort()
    const parts: string[] = []
    for (const k of keys) {
      const v = obj[k]
      // Skip undefined fields (matches JSON.stringify behavior — undefined fields
      // are dropped from objects, converted to null in arrays).
      if (v === undefined) continue
      parts.push(JSON.stringify(k) + ":" + canonicalize(v))
    }
    return "{" + parts.join(",") + "}"
  }
  throw new Error("canonicalize: unsupported value")
}

export type HashFn = (input: string) => string

// Field name excluded from the digest. Public so consumers can verify the
// stored digest without depending on a literal string.
export const INTEGRITY_DIGEST_FIELD = "integrityDigest"

export const computeIntegrityDigest = (payload: Record<string, unknown>, hashFn: HashFn): string => {
  const { [INTEGRITY_DIGEST_FIELD]: _omit, ...rest } = payload
  return hashFn(canonicalize(rest as JsonValue))
}

export const verifyIntegrityDigest = (payload: Record<string, unknown>, hashFn: HashFn): boolean => {
  const stored = payload[INTEGRITY_DIGEST_FIELD]
  if (typeof stored !== "string") return false
  const expected = computeIntegrityDigest(payload, hashFn)
  return stored === expected
}

// ---------------------------------------------------------------------------
// Business rules. The schema validates types; this function validates the
// cross-field truthfulness contract. Reasons are returned as a list so a
// single decode can surface every failure at once.
// ---------------------------------------------------------------------------
export interface PayloadShape {
  readonly requested: RequestedIdentity
  readonly executed?: ExecutedIdentity
  readonly observation: Observation
  readonly providerEvidence?: ProviderEvidence
  readonly fallback: Fallback
  readonly silentFallback?: SilentFallback
  readonly identityResult: IdentityResult
  readonly confidence: Confidence
}

const routeKey = (identity: { providerFamily: string; modelID: string }) =>
  `${identity.providerFamily}/${identity.modelID}`

export type ValidationResult = { readonly _tag: "Right"; readonly right: true } | { readonly _tag: "Left"; readonly left: readonly string[] }

export const validatePayload = (
  payload: PayloadShape,
): ValidationResult => {
  const errors: string[] = []

  // --- identityResult ↔ executed/fallback/observation ---
  if (payload.identityResult === "REQUEST_ONLY" && payload.executed !== undefined) {
    errors.push("REQUEST_ONLY requires executed to be undefined")
  }
  if (payload.identityResult === "ADAPTER_CONFIRMED" && payload.executed === undefined) {
    errors.push("ADAPTER_CONFIRMED requires executed to be defined")
  }
  if (payload.identityResult === "PROVIDER_CONFIRMED") {
    if (payload.executed === undefined) {
      errors.push("PROVIDER_CONFIRMED requires executed to be defined")
    }
    if (payload.providerEvidence === undefined) {
      errors.push("PROVIDER_CONFIRMED requires providerEvidence (provider-evidence class)")
    }
  }
  if (payload.identityResult === "OBSERVATION_UNAVAILABLE" && payload.observation.status !== "UNAVAILABLE") {
    errors.push("OBSERVATION_UNAVAILABLE requires observation.status === UNAVAILABLE")
  }

  // --- fallback equality constraints ---
  if (payload.fallback.used === false) {
    if (payload.fallback.fromRoute !== undefined) {
      errors.push("fallback.used=false requires fromRoute to be undefined")
    }
    if (payload.fallback.toRoute !== undefined) {
      errors.push("fallback.used=false requires toRoute to be undefined")
    }
    if (payload.fallback.reasonCode !== undefined) {
      errors.push("fallback.used=false requires reasonCode to be undefined")
    }
  } else {
    if (payload.fallback.fromRoute === undefined) {
      errors.push("fallback.used=true requires fromRoute to be defined")
    } else if (payload.executed !== undefined && payload.fallback.fromRoute !== routeKey(payload.requested)) {
      errors.push(
        `fallback.fromRoute (${payload.fallback.fromRoute}) must equal requested route (${routeKey(payload.requested)})`,
      )
    }
    if (payload.fallback.toRoute === undefined) {
      errors.push("fallback.used=true requires toRoute to be defined")
    } else if (payload.executed !== undefined && payload.fallback.toRoute !== routeKey(payload.executed)) {
      errors.push(
        `fallback.toRoute (${payload.fallback.toRoute}) must equal executed route (${routeKey(payload.executed)})`,
      )
    }
    if (payload.fallback.reasonCode === undefined) {
      errors.push("fallback.used=true requires reasonCode to be defined")
    }
    // If executed is missing, fallback cannot be meaningfully used.
    if (payload.executed === undefined) {
      errors.push("fallback.used=true requires executed to be defined")
    }
  }

  // --- silent fallback symmetry ---
  const routesDiffer =
    payload.executed !== undefined &&
    (payload.executed.providerFamily !== payload.requested.providerFamily ||
      payload.executed.modelID !== payload.requested.modelID)
  if (routesDiffer && payload.fallback.used === false && payload.silentFallback?.detected !== true) {
    errors.push(
      "requested and executed routes differ but fallback.used=false and silentFallback.detected !== true",
    )
  }

  return errors.length === 0 ? { _tag: "Right" as const, right: true } : { _tag: "Left" as const, left: errors }
}

// ---------------------------------------------------------------------------
// Data shape (effect-schema-level validation). Cross-field rules are layered
// by validatePayload so the type system stays decoupled from rule evaluation.
// ---------------------------------------------------------------------------
export const RouteAttestationData = Schema.Struct({
  sessionID: SessionID,
  messageID: MessageID,
  attemptID: AttemptID,
  timestamp: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  requested: RequestedIdentity,
  executed: optional(ExecutedIdentity),
  observation: Observation,
  providerEvidence: optional(ProviderEvidence),
  fallback: Fallback,
  silentFallback: optional(SilentFallback),
  identityResult: IdentityResult,
  confidence: Confidence,
  integrityDigest: Schema.String,
  schemaVersion: SchemaVersion,
}).annotate({ identifier: "ModelRouteAttestationData" })

// ---------------------------------------------------------------------------
// Durable event registration. Aggregate by sessionID so per-attempt rows
// fold into the existing session timeline.
// ---------------------------------------------------------------------------
const options = {
  durable: {
    aggregate: "sessionID",
    version: 1,
  },
} as const

export const RouteAttestation = define({
  type: "model.route.attestation",
  ...options,
  schema: {
    sessionID: SessionID,
    messageID: MessageID,
    attemptID: AttemptID,
    timestamp: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
    requested: RequestedIdentity,
    executed: optional(ExecutedIdentity),
    observation: Observation,
    providerEvidence: optional(ProviderEvidence),
    fallback: Fallback,
    silentFallback: optional(SilentFallback),
    identityResult: IdentityResult,
    confidence: Confidence,
    integrityDigest: Schema.String,
    schemaVersion: SchemaVersion,
  },
})

export const Event = {
  RouteAttestation,
  Definitions: inventory(RouteAttestation),
}
