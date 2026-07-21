import { afterEach, describe, expect, test } from "bun:test"
import path from "path"
import {
  FORBIDDEN_PROPERTY_NAMES,
  toPublicConfig,
  type PublicConfig,
} from "@opencode-ai/core/v1/config/public"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import { disposeAllInstances, TestInstance } from "../fixture/fixture"
import { httpApiLayer, requestInDirectory } from "./httpapi-layer"
import { testEffect } from "../lib/effect"
import { Effect } from "effect"

const it = testEffect(httpApiLayer)

const SENTINEL_API_KEY = "sentinel-AKIAIOSFODNN7EXAMPLE-CANARY-9c2f"
const SENTINEL_TOKEN = "sentinel-token-CANARY-1f2e3d4c5b6a"
const SENTINEL_BEARER = "sentinel-Bearer-CANARY-9z8y7x"
const SENTINEL_PASSWORD = "sentinel-pwd-CANARY-p@ssw0rd"

const SENTINELS = [SENTINEL_API_KEY, SENTINEL_TOKEN, SENTINEL_BEARER, SENTINEL_PASSWORD]

afterEach(async () => {
  await disposeAllInstances()
})

function makeEvilConfig(): ConfigV1.Info {
  return {
    shell: "/bin/zsh",
    model: "anthropic/claude-sonnet-4-5",
    share: "manual",
    disabled_providers: ["openai"],
    enabled_providers: ["anthropic"],
    provider: {
      anthropic: {
        name: "Anthropic",
        npm: "@ai-sdk/anthropic",
        options: {
          apiKey: SENTINEL_API_KEY,
          baseURL: "https://api.anthropic.com",
          headers: {
            Authorization: SENTINEL_BEARER,
            "X-Internal": "should-not-leak",
          },
        },
        models: {
          "claude-sonnet-4-5": {
            id: "claude-sonnet-4-5",
            name: "Claude Sonnet 4.5",
            status: "active",
            options: { extraBody: { apiKey: SENTINEL_API_KEY } },
            headers: { Authorization: SENTINEL_BEARER },
            variants: {
              reasoning: { budget_tokens: 4096, disabled: false },
            },
          },
        },
      },
    },
    mcp: {
      leaky: {
        type: "local",
        command: ["env", SENTINEL_API_KEY],
        environment: { API_KEY: SENTINEL_API_KEY },
        enabled: true,
      },
    },
    lsp: {
      rust: {
        command: ["/bin/rust-analyzer"],
        env: { API_KEY: SENTINEL_API_KEY },
        initialization: { apiKey: SENTINEL_API_KEY },
        disabled: false,
      },
    },
    plugin: ["my-plugin", ["tuple-plugin", { token: SENTINEL_TOKEN }]],
    permission: {
      bash: "ask",
      "*": "allow",
      custom_pattern_user_data: { "*": "deny" as const },
    },
    experimental: { disable_paste_summary: true },
    username: "tester",
    default_agent: "build",
    small_model: "anthropic/claude-haiku-4-5",
  }
}

function jsonStringHasNoSentinels(value: unknown) {
  const serialized = JSON.stringify(value)
  for (const sentinel of SENTINELS) {
    expect(serialized).not.toContain(sentinel)
  }
  for (const forbidden of FORBIDDEN_PROPERTY_NAMES) {
    expect(serialized).not.toContain(`"${forbidden}"`)
  }
  return serialized
}

function containsForbiddenKey(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (Array.isArray(value)) return value.some(containsForbiddenKey)
  if (typeof value !== "object") return false
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if ((FORBIDDEN_PROPERTY_NAMES as readonly string[]).includes(key)) return true
    if (containsForbiddenKey((value as Record<string, unknown>)[key])) return true
  }
  return false
}

describe("config router sentinels", () => {
  it.instance(
    "PATCH /config returns sanitized public DTO with no sentinel strings or forbidden keys at any depth",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const payload = makeEvilConfig()
        const res = yield* requestInDirectory("/config", test.directory, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
        expect(res.status).toBe(200)
        const body = yield* res.json
        const serialized = jsonStringHasNoSentinels(body)
        expect(containsForbiddenKey(body)).toBe(false)
        expect((body as PublicConfig).provider?.anthropic?.credentialConfigured).toBe(true)
        expect((body as PublicConfig).provider?.anthropic?.npm).toBe("@ai-sdk/anthropic")
        expect((body as PublicConfig).plugin).toEqual(["my-plugin", "tuple-plugin"])
        expect((body as PublicConfig).plugin).not.toContainEqual(["tuple-plugin", expect.anything()])
        expect(serialized).toContain("anthropic")
        // Closed-allowlist: removed fields must not surface.
        expect(body).not.toHaveProperty("$schema")
        expect(body).not.toHaveProperty("username")
        expect(body).not.toHaveProperty("default_agent")
        expect(body).not.toHaveProperty("small_model")
        expect(body).not.toHaveProperty("enabled_providers")
        expect((body as PublicConfig).provider?.anthropic).not.toHaveProperty("enabled")
        expect((body as PublicConfig).provider?.anthropic?.models?.["claude-sonnet-4-5"]).not.toHaveProperty(
          "status",
        )
      }),
    { git: true, config: { formatter: false, lsp: false } },
  )

  it.instance(
    "GET /config after PATCH reflects sanitized state, no sentinels leaked",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const patchRes = yield* requestInDirectory("/config", test.directory, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(makeEvilConfig()),
        })
        expect(patchRes.status).toBe(200)
        const getRes = yield* requestInDirectory("/config", test.directory)
        const body = yield* getRes.json
        jsonStringHasNoSentinels(body)
        expect(containsForbiddenKey(body)).toBe(false)
      }),
    { git: true, config: { formatter: false, lsp: false } },
  )

  it.instance(
    "PATCH /config payload schema rejection returns 400 with sentinel-redacted message",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const badPayload = {
          share: SENTINEL_TOKEN,
          extra_top_level_garbage: { apiKey: SENTINEL_API_KEY, password: SENTINEL_PASSWORD },
        }
        const res = yield* requestInDirectory("/config", test.directory, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(badPayload),
        })
        expect(res.status).toBe(400)
        const text = yield* res.text
        expect(text).not.toContain(SENTINEL_TOKEN)
        expect(text).not.toContain(SENTINEL_API_KEY)
        expect(text).not.toContain(SENTINEL_PASSWORD)
        for (const forbidden of FORBIDDEN_PROPERTY_NAMES) {
          expect(text).not.toContain(`"${forbidden}": "`)
        }
      }),
    { git: true, config: { formatter: false, lsp: false } },
  )

  it.instance(
    "GET /config with stored evil config never echoes sentinel or forbidden keys at any depth",
    () =>
      Effect.gen(function* () {
        const test = yield* TestInstance
        const prior = yield* requestInDirectory("/config", test.directory, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(makeEvilConfig()),
        })
        expect(prior.status).toBe(200)
        const stored = Bun.file(path.join(test.directory, "config.json"))
        const storedText = yield* Effect.promise(() => stored.text())
        expect(storedText).toContain(SENTINEL_API_KEY)

        const res = yield* requestInDirectory("/config", test.directory)
        const body = yield* res.json
        jsonStringHasNoSentinels(body)
        expect(containsForbiddenKey(body)).toBe(false)
      }),
    { git: true, config: { formatter: false, lsp: false } },
  )
})

describe("public Config DTO allowlist invariant", () => {
  test("projection output never contains a forbidden property name at any depth", () => {
    const input = makeEvilConfig()
    const projected = toPublicConfig(input as ConfigV1.Info, { credentialConfigured: () => true })
    expect(containsForbiddenKey(projected)).toBe(false)
    jsonStringHasNoSentinels(projected)
  })
})
