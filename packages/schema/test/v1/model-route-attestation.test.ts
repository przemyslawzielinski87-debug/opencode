// PRZ-96 R2 — model.route.attestation contract tests
// Schema-only stage. Schema package must remain browser-safe; HashFn is injected.
import { describe, expect, test } from "bun:test"
import { Result, Schema } from "effect"
import { ModelRouteAttestationV1 } from "../../src/v1/model-route-attestation"
import { SessionV1 } from "../../src/v1/session"

const {
  AttemptID,
  RequestedIdentity,
  ExecutedIdentity,
  ObservedIdentity,
  ObservationStatus,
  Observation,
  IdentityResult,
  ProviderEvidenceClass,
  ProviderEvidence,
  Confidence,
  Fallback,
  FallbackReasonCode,
  SilentFallback,
  SchemaVersion,
  RouteAttestation,
  canonicalize,
  computeIntegrityDigest,
  verifyIntegrityDigest,
  validatePayload,
  INTEGRITY_DIGEST_FIELD,
  RouteAttestationData,
} = ModelRouteAttestationV1

const decode = (input: unknown) => Schema.decodeUnknownResult(RouteAttestationData)(input)
const isSuccess = (r: any): boolean => r != null && Result.isSuccess(r)
const isFailure = (r: any): boolean => r != null && Result.isFailure(r)
const successValue = (r: any): any => (isSuccess(r) ? r.success : undefined)
const failureMessage = (r: any): any => (isFailure(r) ? r.failure?.message : undefined)

// Injected SHA-256 hash function (test-side only). Production should inject the same shape.
const sha256Hex = (input: string): string => {
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(input)
  return "sha256:" + hasher.digest("hex")
}

// ponytail: helpers below are intentionally minimal; single-use mutations stay inline.

// ponytail: helpers below are intentionally minimal; single-use mutations stay inline.
const omitUndefined = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out
}

// Build a default payload where every field is coherent and a valid digest is precomputed.
const makePayload = (overrides: Partial<any> = {}) => {
  const base = {
    sessionID: "ses_test12345" as any,
    messageID: "msg_test12345" as any,
    attemptID: "att_test12345" as any,
    timestamp: 1_700_000_000_000,
    requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
    executed: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
    observation: {
      status: "AVAILABLE" as const,
      observed: { providerFamily: "anthropic" },
    },
    fallback: { used: false },
    identityResult: "ADAPTER_CONFIRMED" as const,
    confidence: "ADAPTER_PROVEN" as const,
    integrityDigest: "",
    schemaVersion: "1.0.0" as const,
  }
  const merged = omitUndefined({ ...base, ...overrides }) as any
  merged.integrityDigest = computeIntegrityDigest(merged as any, sha256Hex)
  return merged
}

describe("PRZ-96 R2 / model.route.attestation", () => {
  test("T01: REQUEST_ONLY identity when execution unavailable", () => {
    const payload = makePayload({ identityResult: "REQUEST_ONLY", confidence: "UNPROVEN" })
    delete (payload as any).executed
    payload.integrityDigest = computeIntegrityDigest(payload as any, sha256Hex)
    const result = decode(payload)
    expect(isSuccess(result)).toBe(true)
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T02: ADAPTER_CONFIRMED without provider proof is admitted", () => {
    const payload = makePayload({
      executed: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      identityResult: "ADAPTER_CONFIRMED",
    })
    const result = decode(payload)
    expect(isSuccess(result)).toBe(true)
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T03: PROVIDER_CONFIRMED requires provider-evidence class", () => {
    const payload = makePayload({
      identityResult: "PROVIDER_CONFIRMED",
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T04: generic observation cannot produce PROVIDER_CONFIRMED", () => {
    // Observation present with providerFamily but no provider-evidence class
    const payload = makePayload({
      identityResult: "PROVIDER_CONFIRMED",
      observation: {
        status: "AVAILABLE" as const,
        observed: { providerFamily: "anthropic" },
      },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T05: valid provider-evidence input may represent PROVIDER_CONFIRMED", () => {
    const payload = makePayload({
      identityResult: "PROVIDER_CONFIRMED",
      providerEvidence: {
        class: "PRZ79_ADAPTER_PROVIDER_PROOF" as const,
      },
      confidence: "PROVIDER_PROVEN" as const,
    })
    const result = decode(payload)
    expect(isSuccess(result)).toBe(true)
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T06: trusted observation mismatch yields MISMATCH_DETECTED", () => {
    const payload = makePayload({
      executed: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      observation: {
        status: "AVAILABLE" as const,
        observed: { providerFamily: "openai" },
      },
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
      silentFallback: { detected: true, reason: "trusted_observation_conflict" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T07: unavailable observation is explicit and REPRESENTED", () => {
    const payload = makePayload({
      observation: { status: "UNAVAILABLE" as const },
      identityResult: "OBSERVATION_UNAVAILABLE",
      confidence: "UNAVAILABLE" as const,
    })
    const result = decode(payload)
    expect(isSuccess(result)).toBe(true)
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T08: undeclared route mismatch implies silent fallback", () => {
    // Requested 'anthropic' but executed 'openai' with fallback.used=false ⇒ silent fallback
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: { used: false, fromRoute: undefined, toRoute: undefined, reasonCode: undefined },
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
      silentFallback: { detected: true, reason: "undeclared_route_change" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T09: F01 valid declared fallback", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "openai/gpt-4",
        reasonCode: "FB_QUOTA_EXHAUSTED" as const,
      },
      identityResult: "ADAPTER_CONFIRMED",
      confidence: "ADAPTER_PROVEN" as const,
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("T10: F02 mismatched from_route rejected", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "wrong/route",
        toRoute: "openai/gpt-4",
        reasonCode: "FB_QUOTA_EXHAUSTED" as const,
      },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T11: F03 mismatched to_route rejected", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "wrong/route",
        reasonCode: "FB_QUOTA_EXHAUSTED" as const,
      },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T12: F04 missing reason rejected", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "openai/gpt-4",
        reasonCode: undefined,
      },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T13: F04A unknown reason rejected", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "openai/gpt-4",
        reasonCode: "UNKNOWN_REASON" as any,
      },
    })
    const result = decode(payload)
    expect(isFailure(result)).toBe(true)
  })

  test("T13b: F04A REFERENCE_ONLY reason rejected", () => {
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "gpt-4" },
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "openai/gpt-4",
        reasonCode: "HL_TRANSITION_INITIAL_PROBE" as any,
      },
    })
    const result = decode(payload)
    expect(isFailure(result)).toBe(true)
  })

  test("T14: F06 used=false with non-null fallback rejected", () => {
    const payload = makePayload({
      fallback: {
        used: false,
        fromRoute: "anthropic/claude-3-5-sonnet" as any,
        toRoute: undefined,
        reasonCode: undefined,
      },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
  })

  test("T15: canonicalization stable across key order; arrays preserve order", () => {
    const a = { x: 1, y: [3, 1, 2], z: "abc" }
    const b = { z: "abc", y: [3, 1, 2], x: 1 }
    expect(canonicalize(a)).toBe(canonicalize(b))
    // Different array order is NOT canonicalized
    expect(canonicalize({ x: [1, 2, 3] })).not.toBe(canonicalize({ x: [3, 2, 1] }))
  })

  test("T16: digest changes when protected fields change", () => {
    const a = makePayload()
    const b = makePayload({ requested: { providerFamily: "openai", modelID: "gpt-4" } })
    const c = makePayload({
      fallback: {
        used: true,
        fromRoute: "anthropic/claude-3-5-sonnet",
        toRoute: "openai/gpt-4",
        reasonCode: "FB_QUOTA_EXHAUSTED" as const,
      },
    })
    const da = computeIntegrityDigest(a, sha256Hex)
    const db = computeIntegrityDigest(b, sha256Hex)
    const dc = computeIntegrityDigest(c, sha256Hex)
    expect(da).not.toBe(db)
    expect(da).not.toBe(dc)
    expect(db).not.toBe(dc)
  })

  test("T17: digest is integrity-only — different identity payloads produce different digests", () => {
    const a = makePayload({ requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" } })
    const b = makePayload({ requested: { providerFamily: "openai", modelID: "gpt-4" } })
    const da = computeIntegrityDigest(a, sha256Hex)
    const db = computeIntegrityDigest(b, sha256Hex)
    expect(da).not.toBe(db)
    // Digest field is excluded from itself
    const aWithoutDigest = { ...a }
    delete (aWithoutDigest as any).integrityDigest
    const recomputed = sha256Hex(canonicalize(aWithoutDigest as any))
    expect(da).toBe("sha256:" + recomputed.slice(7))
  })

  test("T18: invalid timestamp rejected", () => {
    const payload = makePayload({ timestamp: -1 })
    const result = decode(payload)
    expect(isFailure(result)).toBe(true)
  })

  test("T18b: non-finite timestamp rejected", () => {
    const payload = makePayload({ timestamp: "not-a-number" as any })
    const result = decode(payload)
    expect(isFailure(result)).toBe(true)
  })

  test("T19: invalid attempt ID rejected", () => {
    const payload = makePayload({ attemptID: "no-prefix-12345" as any })
    const result = decode(payload)
    expect(isFailure(result)).toBe(true)
  })

  test("T20: event manifest registration PASS", () => {
    const inInventory = SessionV1.Event.Definitions.some((d) => d.type === "model.route.attestation")
    expect(inInventory).toBe(true)
  })

  test("T21: forbidden metadata cannot be represented in the schema type (real compile-time guard)", () => {
    // The schema's TypeScript type is closed: unknown fields are not declared.
    // The compile-time guard below is structural — if any forbidden field ever becomes
    // a key of the durable event data type, the next `_CompileTimeGuard` alias fails
    // TypeScript compilation (AssignNever constraint not satisfied).
    const forbiddenFields = [
      "apiKey",
      "bearer",
      "cookies",
      "headers",
      "authorization",
      "raw",
      "rawHeaders",
      "rawBody",
      "responseBody",
      "secrets",
      "credential",
      "prompts",
      "toolArguments",
      "privateReasoning",
      "endpointUrl",
      "metadata",
    ] as const
    type ForbiddenField = (typeof forbiddenFields)[number]
    type Data = Schema.Schema.Type<typeof RouteAttestation.data>
    // ponytail: `Extract<ForbiddenField, keyof Data>` is `never` iff no forbidden
    // field is a data key. `AssertNever<T extends never>` requires the type to be
    // exactly `never`; any non-empty overlap violates the constraint and breaks
    // the build. This is the contract — the type alias below makes it visible.
    type AssertNever<T extends never> = T
    type _Overlap = Extract<ForbiddenField, keyof Data>
    type _CompileTimeGuard = AssertNever<_Overlap>
    // The assignment below enforces the never constraint at compile time.
    // If _Overlap becomes non-empty, the cast `as _CompileTimeGuard` is invalid
    // and the typecheck fails. `undefined as never` is the standard pattern for
    // a value of type `never`.
    const _proof: _CompileTimeGuard = undefined as never
    void _proof
    // Runtime defense in depth: a canonical payload never includes any forbidden key.
    const sample = makePayload() as Record<string, unknown>
    for (const field of forbiddenFields) {
      expect(sample[field as string]).toBeUndefined()
    }
  })

  // --- PRZ-103: identity-result / confidence coherence correction matrix ---

  test("C01: false MISMATCH_DETECTED (coherent identities) is rejected", () => {
    // requested == executed AND observed.providerFamily == executed.providerFamily
    // ⇒ no mismatch source exists. identityResult=MISMATCH_DETECTED must fail closed.
    const payload = makePayload({
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
      silentFallback: { detected: true, reason: "claimed_but_unproven" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/MISMATCH_DETECTED/)
  })

  test("C02: real requested/executed providerFamily mismatch classifies MISMATCH_DETECTED", () => {
    // requested vs executed: only providerFamily differs, modelID equal.
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "claude-3-5-sonnet" },
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
      silentFallback: { detected: true, reason: "route_change_undeclared" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("C03: real requested/executed modelID mismatch classifies MISMATCH_DETECTED", () => {
    // requested vs executed: only modelID differs, providerFamily equal.
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "anthropic", modelID: "gpt-4" },
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
      silentFallback: { detected: true, reason: "model_swap_undeclared" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("C04: real observed/executed providerFamily mismatch classifies MISMATCH_DETECTED", () => {
    // requested == executed (no requested/executed mismatch); observed.providerFamily
    // differs from executed.providerFamily ⇒ real observed/executed mismatch source.
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      observation: { status: "AVAILABLE" as const, observed: { providerFamily: "openai" } },
      identityResult: "MISMATCH_DETECTED",
      confidence: "REJECTED" as const,
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Right")
  })

  test("C05: MISMATCH_DETECTED with non-REJECTED confidence is rejected", () => {
    // Real mismatch source exists, but confidence is not the binding REJECTED.
    const payload = makePayload({
      requested: { providerFamily: "anthropic", modelID: "claude-3-5-sonnet" },
      executed: { providerFamily: "openai", modelID: "claude-3-5-sonnet" },
      identityResult: "MISMATCH_DETECTED",
      confidence: "ADAPTER_PROVEN" as const,
      silentFallback: { detected: true, reason: "wrong_confidence" },
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/binding/i)
  })

  test("C06: REQUEST_ONLY with non-UNPROVEN confidence is rejected", () => {
    const payload = makePayload({
      identityResult: "REQUEST_ONLY",
      confidence: "ADAPTER_PROVEN" as const,
    })
    delete (payload as any).executed
    payload.integrityDigest = computeIntegrityDigest(payload as any, sha256Hex)
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/binding/i)
  })

  test("C07: ADAPTER_CONFIRMED with non-ADAPTER_PROVEN confidence is rejected", () => {
    const payload = makePayload({
      identityResult: "ADAPTER_CONFIRMED",
      confidence: "UNPROVEN" as const,
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/binding/i)
  })

  test("C08: PROVIDER_CONFIRMED with non-PROVIDER_PROVEN confidence is rejected", () => {
    const payload = makePayload({
      identityResult: "PROVIDER_CONFIRMED",
      providerEvidence: { class: "PRZ79_ADAPTER_PROVIDER_PROOF" as const },
      confidence: "UNPROVEN" as const,
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/binding/i)
  })

  test("C09: OBSERVATION_UNAVAILABLE with non-UNAVAILABLE confidence is rejected", () => {
    const payload = makePayload({
      observation: { status: "UNAVAILABLE" as const },
      identityResult: "OBSERVATION_UNAVAILABLE",
      confidence: "UNPROVEN" as const,
    })
    const validation = validatePayload(payload as any)
    expect(validation._tag).toBe("Left")
    expect((validation as any).left.join("\n")).toMatch(/binding/i)
  })

  test("C10: each valid identity/confidence binding pair remains accepted", () => {
    // Regression: every cell in the binding matrix admits a payload when all other
    // cross-field rules are satisfied. This prevents future regressions in the
    // coherence contract.
    const cases: Array<{
      overrides: Record<string, unknown>
      dropExecuted?: boolean
    }> = [
      // REQUEST_ONLY + UNPROVEN
      { overrides: { identityResult: "REQUEST_ONLY", confidence: "UNPROVEN" }, dropExecuted: true },
      // ADAPTER_CONFIRMED + ADAPTER_PROVEN
      { overrides: { identityResult: "ADAPTER_CONFIRMED", confidence: "ADAPTER_PROVEN" } },
      // PROVIDER_CONFIRMED + PROVIDER_PROVEN
      {
        overrides: {
          identityResult: "PROVIDER_CONFIRMED",
          confidence: "PROVIDER_PROVEN",
          providerEvidence: { class: "PRZ79_ADAPTER_PROVIDER_PROOF" as const },
        },
      },
      // MISMATCH_DETECTED + REJECTED (observed/executed mismatch)
      {
        overrides: {
          identityResult: "MISMATCH_DETECTED",
          confidence: "REJECTED",
          observation: { status: "AVAILABLE" as const, observed: { providerFamily: "openai" } },
        },
      },
      // OBSERVATION_UNAVAILABLE + UNAVAILABLE
      {
        overrides: {
          identityResult: "OBSERVATION_UNAVAILABLE",
          confidence: "UNAVAILABLE",
          observation: { status: "UNAVAILABLE" as const },
        },
      },
    ]
    for (const c of cases) {
      const payload = makePayload(c.overrides as any)
      if (c.dropExecuted) delete (payload as any).executed
      payload.integrityDigest = computeIntegrityDigest(payload as any, sha256Hex)
      const validation = validatePayload(payload as any)
      expect(validation._tag).toBe("Right")
    }
  })

  test("T22: encode/decode round-trip", () => {
    const payload = makePayload()
    const decoded = decode(payload)
    expect(isSuccess(decoded)).toBe(true)
    if (isSuccess(decoded)) {
      expect(successValue(decoded)).toEqual(payload)
    }
  })

  test("T23: existing event fixtures remain compatible (other SessionV1 events still decodable)", () => {
    // Pull any pre-existing SessionV1 event and verify decode still works.
    const existing = SessionV1.Event.Definitions.find((d) => d.type === "session.created")
    expect(existing).toBeDefined()
    const sample = {
      id: "evt_testabc123" as any,
      type: "session.created" as const,
      data: {
        sessionID: "ses_test12345" as any,
        info: {
          id: "ses_test12345" as any,
          slug: "demo",
          projectID: "prj_test123" as any,
          directory: "/tmp",
          title: "demo",
          version: "1",
          time: { created: 1, updated: 1 },
        },
      },
    }
    const result = Schema.decodeUnknownResult(existing!)(sample)
    expect(isSuccess(result)).toBe(true)
  })

  test("T24: schema module has no runtime imports (no crypto, no node:* imports)", () => {
    // Bun compiles TS; we read the source to check for forbidden imports.
    const path = require("node:path")
    const source = require("node:fs").readFileSync(
      path.join(import.meta.dir, "..", "..", "src", "v1", "model-route-attestation.ts"),
      "utf8",
    )
    expect(source).not.toMatch(/from\s+["']node:/)
    expect(source).not.toMatch(/from\s+["']crypto["']/)
    expect(source).not.toMatch(/from\s+["']bun["']/)
    expect(source).not.toMatch(/from\s+["']@effect\/platform/)
  })

  test("verifyIntegrityDigest returns true for matching payload and false for tampered", () => {
    const payload = makePayload()
    expect(verifyIntegrityDigest(payload, sha256Hex)).toBe(true)
    const tampered = { ...payload, requested: { providerFamily: "openai", modelID: "gpt-4" } }
    // Digest on tampered no longer matches the stored digest
    expect(verifyIntegrityDigest(tampered, sha256Hex)).toBe(false)
  })

  test("INTEGRITY_DIGEST_FIELD is the canonical key", () => {
    expect(INTEGRITY_DIGEST_FIELD).toBe("integrityDigest")
  })

  test("schemaVersion is locked to 1.0.0", () => {
    expect(SchemaVersion.literal).toBe("1.0.0")
  })

  test("ProviderEvidenceClass is reserved for PRZ-97", () => {
    expect(ProviderEvidenceClass.literals).toEqual(["PRZ79_ADAPTER_PROVIDER_PROOF"])
  })

  test("FallbackReasonCode accepts only ACTIVE PRZ-85 R3 FB codes", () => {
    const allowed = new Set<string>(FallbackReasonCode.literals)
    expect(allowed.has("FB_QUOTA_EXHAUSTED")).toBe(true)
    expect(allowed.has("FB_PROVIDER_UNAVAILABLE")).toBe(true)
    expect(allowed.has("FB_HEALTH_FLAPPING")).toBe(true)
    // REFERENCE_ONLY must NOT be allowed
    expect(allowed.has("HL_TRANSITION_INITIAL_PROBE")).toBe(false)
    expect(allowed.has("RULE_FAMILY_FORM")).toBe(false)
    // Deprecated aliases must NOT be allowed
    expect(allowed.has("FB_TIMEOUT_AFTER_DISPATCH_NO_SILENT_REDISPATCH")).toBe(false)
    expect(allowed.has("FB_RETRY_ANOMALY_DETECTED")).toBe(false)
  })
})
