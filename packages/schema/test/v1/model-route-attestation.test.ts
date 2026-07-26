import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import {
  classify,
  canonicalize,
  buildAttestation,
  extractTrustedObservation,
  ModelRouteAttestation,
} from "../../src/v1/model-route-attestation"
import { SessionV1 } from "../../src/v1/session"

const requested = { provider_id: "kimi-code", model_id: "k3", route: "kimi-code/k3" }
const executed = {
  provider_id: "kimi-code",
  model_id: "k3",
  route: "kimi-code/k3",
  adapter_id: "kimi-code",
  runtime_id: "ai-sdk" as const,
}

const runID = "run_01HV2NAKSGNXT0HX3Q1X9D02ZE"
const sessionID = "ses_01HV2NAKSGNXT0HX3Q1X9D02ZA"
const messageID = "msg_01HV2NAKSGNXT0HX3Q1X9D02ZB"
const timestampUtc = "2026-07-24T17:30:00.000Z"

const testHash = (canonical: string) =>
  new Bun.CryptoHasher("sha256").update(canonical).digest("hex")

const makePayload = (overrides?: {
  observed?: { provider_id?: string | null; model_id?: string | null; provider_request_id?: string | null }
  fallback?: { used: boolean; from_route?: string | null; to_route?: string | null; reason_code?: string | null }
}) =>
  buildAttestation(
    {
      session_id: sessionID,
      run_id: runID,
      message_id: messageID,
      requested,
      executed,
      observed: overrides?.observed ?? {},
      fallback: overrides?.fallback ?? { used: false },
      timestamp_utc: timestampUtc,
    },
    testHash,
  )

describe("classify", () => {
  test("requested == executed, observed null -> ADAPTER_CONFIRMED", () => {
    const identity = classify({ requested, executed, observed: {}, fallback: { used: false } })
    expect(identity.level).toBe("ADAPTER_CONFIRMED")
    expect(identity.route_identity_proven).toBe(true)
    expect(identity.model_identity_proven).toBe(false)
    expect(identity.silent_fallback_detected).toBe(false)
  })

  test("trusted observed provider/model == executed -> PROVIDER_CONFIRMED", () => {
    const identity = classify({
      requested,
      executed,
      observed: { provider_id: "kimi-code", model_id: "k3", provider_request_id: "req_123" },
      fallback: { used: false },
    })
    expect(identity.level).toBe("PROVIDER_CONFIRMED")
    expect(identity.route_identity_proven).toBe(true)
    expect(identity.model_identity_proven).toBe(true)
    expect(identity.silent_fallback_detected).toBe(false)
  })

  test("only requested -> REQUEST_ONLY", () => {
    const identity = classify({ requested, executed: undefined, observed: {}, fallback: { used: false } })
    expect(identity.level).toBe("REQUEST_ONLY")
    expect(identity.route_identity_proven).toBe(false)
    expect(identity.model_identity_proven).toBe(false)
    expect(identity.silent_fallback_detected).toBe(false)
  })

  test("requested != executed, fallback false -> MISMATCH_DETECTED + silent", () => {
    const identity = classify({
      requested,
      executed: { ...executed, provider_id: "openai", model_id: "gpt-4o", route: "openai/gpt-4o" },
      observed: {},
      fallback: { used: false },
    })
    expect(identity.level).toBe("MISMATCH_DETECTED")
    expect(identity.route_identity_proven).toBe(false)
    expect(identity.model_identity_proven).toBe(false)
    expect(identity.silent_fallback_detected).toBe(true)
  })

  test("requested != executed, explicit fallback consistent -> not silent", () => {
    const identity = classify({
      requested,
      executed: { ...executed, provider_id: "openai", model_id: "gpt-4o", route: "openai/gpt-4o" },
      observed: {},
      fallback: {
        used: true,
        from_route: "kimi-code/k3",
        to_route: "openai/gpt-4o",
        reason_code: "MODEL_UNAVAILABLE",
      },
    })
    expect(identity.level).toBe("ADAPTER_CONFIRMED")
    expect(identity.silent_fallback_detected).toBe(false)
  })

  test("observed != executed -> MISMATCH_DETECTED + silent", () => {
    const identity = classify({
      requested,
      executed,
      observed: { provider_id: "openai", model_id: "gpt-4o" },
      fallback: { used: false },
    })
    expect(identity.level).toBe("MISMATCH_DETECTED")
    expect(identity.silent_fallback_detected).toBe(true)
  })

  test("explicit fallback with observed mismatch -> MISMATCH_DETECTED not silent", () => {
    const identity = classify({
      requested,
      executed: { ...executed, provider_id: "openai", model_id: "gpt-4o", route: "openai/gpt-4o" },
      observed: { provider_id: "anthropic", model_id: "claude" },
      fallback: {
        used: true,
        from_route: "kimi-code/k3",
        to_route: "openai/gpt-4o",
        reason_code: "MODEL_UNAVAILABLE",
      },
    })
    expect(identity.level).toBe("MISMATCH_DETECTED")
    expect(identity.silent_fallback_detected).toBe(false)
  })

  test("explicit fallback missing fields is invalid", () => {
    expect(() =>
      classify({
        requested,
        executed,
        observed: {},
        fallback: { used: true, from_route: null, to_route: null, reason_code: null },
      }),
    ).toThrow()
  })

  test("route canonicalization", () => {
    const identity = classify({
      requested: { provider_id: "a", model_id: "b", route: "a/b" },
      executed: { provider_id: "a", model_id: "b", route: "a/b", adapter_id: "a", runtime_id: "native" },
      observed: {},
      fallback: { used: false },
    })
    expect(identity.route_identity_proven).toBe(true)
  })

  test("reason code enum rejects unknown values", () => {
    expect(Schema.is(ModelRouteAttestation.ReasonCode)("UNKNOWN_REASON")).toBe(false)
  })
})

describe("canonical hash", () => {
  test("insertion order does not change canonical JSON", () => {
    const a = canonicalize({ b: 1, a: 2 })
    const b = canonicalize({ a: 2, b: 1 })
    expect(a).toBe(b)
    expect(a).toBe('{"a":2,"b":1}')
  })

  test("nested key order does not change hash", () => {
    const a = testHash(canonicalize({ nested: { b: 1, a: 2 }, top: "x" }))
    const b = testHash(canonicalize({ top: "x", nested: { a: 2, b: 1 } }))
    expect(a).toBe(b)
  })

  test("single field change changes hash", () => {
    const a = testHash(canonicalize({ x: 1 }))
    const b = testHash(canonicalize({ x: 2 }))
    expect(a).not.toBe(b)
  })

  test("hash matches regex", () => {
    const h = testHash(canonicalize({ x: 1 }))
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  test("null values are preserved", () => {
    expect(canonicalize({ a: null })).toBe('{"a":null}')
  })

  test("arrays preserve order", () => {
    expect(canonicalize({ a: [1, 2, 3] })).toBe('{"a":[1,2,3]}')
    const a = testHash(canonicalize({ a: [1, 2] }))
    const b = testHash(canonicalize({ a: [2, 1] }))
    expect(a).not.toBe(b)
  })

  test("unicode gives deterministic UTF-8 hash", () => {
    const a = testHash(canonicalize({ text: "héllo 世界" }))
    const b = testHash(canonicalize({ text: "héllo 世界" }))
    expect(a).toBe(b)
  })
})

describe("secret-safe observation", () => {
  test("unknown provider metadata does not give provider-confirmed identity", () => {
    const observed = extractTrustedObservation({ provider: "openai", model: "gpt-4o", id: "req_123" })
    expect(observed.provider_id).toBeNull()
    expect(observed.model_id).toBeNull()
    expect(observed.provider_request_id).toBeNull()
  })

  test("metadata with authorization is not persisted", () => {
    const observed = extractTrustedObservation({ authorization: "Bearer secret", api_key: "key", access_token: "tok" })
    expect(observed.provider_id).toBeNull()
    expect(observed.model_id).toBeNull()
    expect(observed.provider_request_id).toBeNull()
  })

  test("metadata with cookie or credential URL is not persisted", () => {
    const observed = extractTrustedObservation({ cookie: "session=secret", url: "https://key:secret@api.com" })
    expect(observed.provider_id).toBeNull()
    expect(observed.model_id).toBeNull()
    expect(observed.provider_request_id).toBeNull()
  })

  test("raw request/response body is not copied", () => {
    const observed = extractTrustedObservation({ body: '{"key":"secret"}', responseBody: "text" })
    expect(observed.provider_id).toBeNull()
  })

  test("ambiguous id is not treated as request/model id", () => {
    const observed = extractTrustedObservation({ id: "model-123" })
    expect(observed.model_id).toBeNull()
    expect(observed.provider_request_id).toBeNull()
  })

  test("display name is not proof", () => {
    const observed = extractTrustedObservation({ name: "OpenAI GPT-4o" })
    expect(observed.provider_id).toBeNull()
    expect(observed.model_id).toBeNull()
  })
})

describe("schema", () => {
  test("accepts valid payload", () => {
    const payload = makePayload()
    expect(Schema.decodeUnknownSync(ModelRouteAttestation.Payload)(payload)).toEqual(payload)
  })

  test("rejects missing correlation IDs", () => {
    const payload = makePayload()
    const withoutSession = { ...payload, session_id: "bad" }
    expect(() => Schema.decodeUnknownSync(ModelRouteAttestation.Payload)(withoutSession)).toThrow()
  })

  test("rejects invalid identity level", () => {
    const payload = makePayload()
    const bad = { ...payload, identity: { ...payload.identity, level: "UNKNOWN" } }
    expect(() => Schema.decodeUnknownSync(ModelRouteAttestation.Payload)(bad)).toThrow()
  })

  test("rejects invalid SHA", () => {
    const payload = makePayload()
    const bad = { ...payload, attestation_sha256: "SHORT" }
    expect(() => Schema.decodeUnknownSync(ModelRouteAttestation.Payload)(bad)).toThrow()
  })

  test("event is in SessionV1.Event.Definitions", () => {
    expect(SessionV1.Event.Definitions.some((d) => d.type === "model.route.attestation")).toBe(true)
  })

  test("existing session events remain decodable", () => {
    const payload = makePayload()
    const encoded = Schema.encodeUnknownSync(ModelRouteAttestation.Event.data)(payload)
    const decoded = Schema.decodeUnknownSync(ModelRouteAttestation.Event.data)(encoded)
    expect(decoded).toEqual(payload)
  })
})

describe("buildAttestation", () => {
  test("builds hash deterministically", () => {
    const a = makePayload()
    const b = makePayload()
    expect(a.attestation_sha256).toBe(b.attestation_sha256)
    expect(a.attestation_sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
