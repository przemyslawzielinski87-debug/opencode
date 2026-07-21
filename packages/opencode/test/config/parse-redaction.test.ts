import { describe, expect, test } from "bun:test"
import { ConfigParse } from "@/config/parse"
import { ConfigErrorV1 } from "@opencode-ai/core/v1/config/error"

const SENTINEL_TOKEN = "sentinel-token-CANARY-1f2e3d4c5b6a"

describe("ConfigParse.jsonc", () => {
  test("valid JSONC is returned as parsed object", () => {
    const data = ConfigParse.jsonc(
      JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        provider: { anthropic: { name: "Anthropic" } },
      }),
      "/test/opencode.json",
    )
    expect(data).toEqual({
      $schema: "https://opencode.ai/config.json",
      provider: { anthropic: { name: "Anthropic" } },
    })
  })

  test("JSONC parse error throws JsonError without leaking full input payload", () => {
    const input = JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      plugin: ["plain", ["with-token", { token: SENTINEL_TOKEN }]],
    }).replace("}", ", BAD")
    expect(() => ConfigParse.jsonc(input, "/test/opencode.json")).toThrow(ConfigErrorV1.JsonError)
    try {
      ConfigParse.jsonc(input, "/test/opencode.json")
    } catch (e) {
      if (!(e instanceof ConfigErrorV1.JsonError)) throw e
      const obj = e.toObject()
      const message = typeof obj.data.message === "string" ? obj.data.message : ""
      expect(message).toContain("InvalidSymbol at /test/opencode.json:1:")
      expect(message).not.toContain(SENTINEL_TOKEN)
      expect(message.length).toBeLessThanOrEqual(2048)
    }
  })

  test("large JSONC parse error is truncated, does not echo full payload", () => {
    const repeated = "0123456789".repeat(200)
    const input = `{\n  "model": "anthropic/claude-sonnet-4-5",\n  "plugin": ["x", ["y", { "token": "${SENTINEL_TOKEN}", "filler": "${repeated}" }]]\n BAD}`
    expect(() => ConfigParse.jsonc(input, "/test/opencode.json")).toThrow(ConfigErrorV1.JsonError)
    try {
      ConfigParse.jsonc(input, "/test/opencode.json")
    } catch (e) {
      if (!(e instanceof ConfigErrorV1.JsonError)) throw e
      const obj = e.toObject()
      const message = typeof obj.data.message === "string" ? obj.data.message : ""
      expect(message).not.toContain(SENTINEL_TOKEN)
      expect(message.length).toBeLessThanOrEqual(2048)
    }
  })
})