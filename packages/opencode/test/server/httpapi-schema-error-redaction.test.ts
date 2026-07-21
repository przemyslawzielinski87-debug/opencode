import { describe, expect, test } from "bun:test"
import { stripActualValues } from "@/server/routes/instance/httpapi/middleware/schema-error"

const SENTINEL_TOKEN = "sentinel-token-CANARY-1f2e3d4c5b6a"
const SENTINEL_PASSWORD = "sentinel-pwd-CANARY-p@ssw0rd"

describe("schema-error middleware redaction", () => {
  test("strips object-shaped actual values", () => {
    const input = `expected string, actual { apiKey: "${SENTINEL_TOKEN}", nested: { secret: "x" } }`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
    expect(out).toContain("actual: <redacted>")
  })

  test("strips array-shaped actual values", () => {
    const input = `expected array, actual [${SENTINEL_TOKEN}, "other"]`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
    expect(out).toContain("actual: <redacted>")
  })

  test("strips string-shaped actual values", () => {
    const input = `expected number, actual "${SENTINEL_TOKEN}"`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
    expect(out).toContain("actual: <redacted>")
  })

  test("strips expected object values", () => {
    const input = `expected { apiKey: "${SENTINEL_TOKEN}" }`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
    expect(out).toContain("expected: <redacted>")
  })

  test("strips inline apiKey values in error messages", () => {
    const input = `expected string, actual "${SENTINEL_TOKEN}"`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
    expect(out).toContain("actual: <redacted>")
  })

  test("strips inline Authorization header values", () => {
    const input = `Invalid header "Authorization": "Bearer ${SENTINEL_TOKEN}"`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
  })

  test("strips inline password values", () => {
    const input = `password: "${SENTINEL_PASSWORD}"`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_PASSWORD)
  })

  test("strips inline token values via key=value", () => {
    const input = `expected number, actual ${SENTINEL_TOKEN}`
    const out = stripActualValues(input)
    expect(out).not.toContain(SENTINEL_TOKEN)
  })

  test("preserves benign content", () => {
    const input = "Invalid value: type mismatch"
    expect(stripActualValues(input)).toBe(input)
  })

  test("strips object/array values assigned to forbidden keys nested inside rejected payload", () => {
    const sentinelA = "sentinel-token-CANARY-1f2e3d4c5b6a"
    const sentinelB = "sentinel-pwd-CANARY-p@ssw0rd"
    const input = `expected object, actual { options: { apiKey: "${sentinelA}", headers: { Authorization: "Bearer ${sentinelB}" } } }`
    const out = stripActualValues(input)
    expect(out).not.toContain(sentinelA)
    expect(out).not.toContain(sentinelB)
  })

  test("strips array-shaped payload containing forbidden keys at any depth", () => {
    const sentinel = "sentinel-token-CANARY-1f2e3d4c5b6a"
    const input = `expected string, actual [{ body: { apiKey: "${sentinel}" } }, { env: { token: "${sentinel}" } }]`
    const out = stripActualValues(input)
    expect(out).not.toContain(sentinel)
    expect(out).toContain("actual: <redacted>")
  })
})