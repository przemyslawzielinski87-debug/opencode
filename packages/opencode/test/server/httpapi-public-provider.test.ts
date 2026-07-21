import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { ModelV2 } from "@opencode-ai/core/model"
import {
  toPublicProviderV2Info,
  toPublicModelV2Info,
  PublicProviderV2InfoSchema,
  PublicModelV2InfoSchema,
  v2CredentialConfigured,
} from "@opencode-ai/core/public-provider"
import {
  toPublicOpencodeProviderInfo,
  opencodeCredentialConfigured,
  PublicOpencodeProviderInfoSchema,
  PublicOpencodeModelSchema,
  PublicOpencodeProviderListResultSchema,
  PublicOpencodeConfigProvidersResultSchema,
} from "@/provider/public"

const SENTINEL_API_KEY = "sentinel-AKIAIOSFODNN7EXAMPLE-CANARY-9c2f"
const SENTINEL_BEARER = "sentinel-Bearer-CANARY-9z8y7x"
const SENTINEL_TOKEN = "sentinel-token-CANARY-1f2e3d4c5b6a"

const makeV2Provider = (
  overrides: Partial<{
    id: string
    name: string
    api: ProviderV2.Api
    request: ProviderV2.Request
    disabled: boolean
  }> = {},
) => {
  return new ProviderV2.Info({
    id: ProviderV2.ID.make(overrides.id ?? "anthropic"),
    name: overrides.name ?? "Anthropic",
    disabled: overrides.disabled,
    api: overrides.api ?? { type: "native", settings: {} },
    request: overrides.request ?? { headers: {}, body: {} },
  })
}

const makeV2Model = (
  overrides: Partial<{
    id: string
    providerID: string
    name: string
    request: ModelV2.Info["request"]
    variants: ModelV2.Info["variants"]
    family: ModelV2.Family
  }> = {},
) => {
  return new ModelV2.Info({
    id: ModelV2.ID.make(overrides.id ?? "claude-sonnet-4-5"),
    providerID: ProviderV2.ID.make(overrides.providerID ?? "anthropic"),
    name: overrides.name ?? "Claude Sonnet 4.5",
    family: overrides.family,
    api: {
      id: ModelV2.ID.make(overrides.id ?? "claude-sonnet-4-5"),
      type: "native",
      url: "https://api.anthropic.com",
      settings: { secret: SENTINEL_TOKEN },
    },
    capabilities: {
      tools: true,
      input: ["text", "image"],
      output: ["text"],
    },
    request:
      overrides.request ??
      ({
        headers: { Authorization: SENTINEL_BEARER },
        body: { apiKey: SENTINEL_API_KEY },
        generation: { maxTokens: 8192 },
        options: { region: "us-east-1" },
        variant: "thinking",
      } as ModelV2.Info["request"]),
    variants: (overrides.variants as ModelV2.Info["variants"]) ?? [
      {
        id: ModelV2.VariantID.make("thinking"),
        headers: {},
        body: {},
        generation: {},
        options: {},
      },
      {
        id: ModelV2.VariantID.make("fast"),
        headers: {},
        body: {},
        generation: {},
        options: {},
      },
    ],
    time: { released: Schema.decodeUnknownSync(Schema.DateTimeUtcFromMillis)(Date.parse("2025-01-01T00:00:00.000Z")) },
    cost: [
      {
        input: 3,
        output: 15,
        cache: { read: 0.3, write: 3.75 },
        tier: { type: "context", size: 200_000 },
      },
    ],
    status: "active",
    enabled: true,
    limit: { context: 200_000, output: 8_192 },
  })
}

describe("public v2 provider/model DTO", () => {
  test("v2CredentialConfigured detects apiKey in request body", () => {
    const info = makeV2Provider({
      request: { headers: {}, body: { apiKey: SENTINEL_API_KEY } },
    })
    expect(v2CredentialConfigured(info)).toBe(true)
    const publicInfo = toPublicProviderV2Info(info)
    expect(publicInfo.credentialConfigured).toBe(true)
    const json = JSON.stringify(publicInfo)
    expect(json).not.toContain(SENTINEL_API_KEY)
    expect(publicInfo).not.toHaveProperty("api")
    expect(publicInfo).not.toHaveProperty("request")
  })

  test("v2CredentialConfigured detects Authorization header", () => {
    const info = makeV2Provider({
      request: {
        headers: { Authorization: SENTINEL_BEARER },
        body: {},
      },
    })
    expect(v2CredentialConfigured(info)).toBe(true)
  })

  test("v2CredentialConfigured returns false when no credentials embedded", () => {
    const info = makeV2Provider()
    expect(v2CredentialConfigured(info)).toBe(false)
    expect(toPublicProviderV2Info(info).credentialConfigured).toBe(false)
  })

  test("public v2 provider DTO encodes only the allowlisted fields", () => {
    const info = makeV2Provider({
      api: {
        type: "aisdk",
        package: "@ai-sdk/anthropic",
        url: "https://api.anthropic.com",
        settings: { apiKey: SENTINEL_API_KEY },
      },
      request: {
        headers: { Authorization: SENTINEL_BEARER },
        body: { apiKey: SENTINEL_API_KEY, region: "us-east-1" },
      },
    })
    const out = toPublicProviderV2Info(info)
    expect(out.id as string).toBe("anthropic")
    expect(out.name).toBe("Anthropic")
    expect(out.credentialConfigured).toBe(true)
    expect(Object.keys(out).sort()).toEqual(["credentialConfigured", "id", "name"])
    const json = JSON.stringify(out)
    expect(json).not.toContain(SENTINEL_API_KEY)
    expect(json).not.toContain(SENTINEL_BEARER)
  })

  test("public v2 model DTO drops request fields and variant internals", () => {
    const info = makeV2Model()
    const out = toPublicModelV2Info(info)
    const json = JSON.stringify(out)
    expect(json).not.toContain(SENTINEL_API_KEY)
    expect(json).not.toContain(SENTINEL_BEARER)
    expect(json).not.toContain(SENTINEL_TOKEN)
    expect(out).not.toHaveProperty("request")
    expect(out).not.toHaveProperty("api")
    expect(out.variants.map((v) => v.id as string)).toEqual(["thinking", "fast"])
    expect(out.variants.every((v) => !("disabled" in v && v.disabled))).toBe(true)
    expect(out.limit).toEqual({ context: 200_000, output: 8_192 })
    expect(out.cost).toEqual([
      {
        input: 3,
        output: 15,
        cache: { read: 0.3, write: 3.75 },
        tier: { type: "context", size: 200_000 },
      },
    ])
  })

  test("public v2 provider DTO decodes through Schema", () => {
    const sample = toPublicProviderV2Info(makeV2Provider({ disabled: true }))
    expect(() => Schema.decodeUnknownSync(PublicProviderV2InfoSchema)(sample)).not.toThrow()
  })

  test("public v2 provider DTO has no runtime shape for forbidden request fields", () => {
    const sample = toPublicProviderV2Info(
      makeV2Provider({
        api: { type: "native", settings: { apiKey: SENTINEL_API_KEY } },
        request: {
          headers: { Authorization: SENTINEL_BEARER },
          body: { apiKey: SENTINEL_API_KEY },
        },
      }),
    )
    expect(sample).not.toHaveProperty("api")
    expect(sample).not.toHaveProperty("request")
    expect(sample).not.toHaveProperty("key")
    expect(sample).not.toHaveProperty("options")
    expect(sample).not.toHaveProperty("headers")
    expect(sample).not.toHaveProperty("environment")
    expect(Object.keys(sample).sort()).toEqual(["credentialConfigured", "id", "name"])
  })

  test("public v2 model DTO decodes through Schema", () => {
    const out = toPublicModelV2Info(makeV2Model())
    expect(() => Schema.decodeUnknownSync(PublicModelV2InfoSchema)(out)).not.toThrow()
    expect(() =>
      Schema.decodeUnknownSync(PublicModelV2InfoSchema)({
        id: "claude-sonnet-4-5",
        providerID: "anthropic",
        name: "Claude Sonnet 4.5",
        capabilities: { tools: true, input: ["text"], output: ["text"] },
        cost: [],
        limit: { context: 1, output: 1 },
        status: "active",
        enabled: true,
        time: { released: "2025-01-01T00:00:00.000Z" },
        variants: [],
        request: { headers: { Authorization: "Bearer leak" }, body: {} },
      }),
    ).toThrow()
  })
})

describe("public opencode provider DTO", () => {
  const baseProvider = () => ({
    id: ProviderV2.ID.make("anthropic"),
    name: "Anthropic",
    source: "env" as const,
    env: ["ANTHROPIC_API_KEY"],
    key: SENTINEL_API_KEY,
    options: {
      baseURL: "https://api.anthropic.com",
      apiKey: SENTINEL_API_KEY,
      headers: { Authorization: SENTINEL_BEARER },
    },
    models: {
      "claude-sonnet-4-5": {
        id: ModelV2.ID.make("claude-sonnet-4-5"),
        providerID: ProviderV2.ID.make("anthropic"),
        name: "Claude Sonnet 4.5",
        family: "claude",
        api: {
          id: "claude-sonnet-4-5",
          url: "https://api.anthropic.com",
          npm: "@ai-sdk/anthropic",
        },
        status: "active" as const,
        headers: { Authorization: SENTINEL_BEARER },
        options: { apiKey: SENTINEL_API_KEY, region: "us-east-1" },
        cost: {
          input: 3,
          output: 15,
          cache: { read: 0.3, write: 3.75 },
        },
        limit: { context: 200_000, input: 200_000, output: 8_192 },
        capabilities: {
          temperature: true,
          reasoning: true,
          attachment: true,
          toolcall: true,
          input: { text: true, audio: false, image: true, video: false, pdf: true },
          output: { text: true, audio: false, image: false, video: false, pdf: false },
          interleaved: false,
        },
        release_date: "2025-01-01",
        variants: {
          thinking: { budget_tokens: 4096, disabled: false },
          fast: { budget_tokens: 1024, disabled: true, secret: SENTINEL_TOKEN },
        },
      },
    },
  })

  test("opencodeCredentialConfigured detects key presence", () => {
    expect(opencodeCredentialConfigured({ ...baseProvider(), key: "x" })).toBe(true)
    expect(opencodeCredentialConfigured({ ...baseProvider(), key: undefined, options: {} })).toBe(false)
    expect(opencodeCredentialConfigured({ ...baseProvider(), key: undefined, options: { apiKey: "x" } })).toBe(true)
  })

  test("public opencode provider DTO encodes only the allowlisted fields", () => {
    const out = toPublicOpencodeProviderInfo(baseProvider())
    const json = JSON.stringify(out)
    expect(json).not.toContain(SENTINEL_API_KEY)
    expect(json).not.toContain(SENTINEL_BEARER)
    expect(json).not.toContain(SENTINEL_TOKEN)
    expect(out.id as string).toBe("anthropic")
    expect(out.name).toBe("Anthropic")
    expect(out.source).toBe("env")
    expect(out.credentialConfigured).toBe(true)
    expect(out.models["claude-sonnet-4-5"]).not.toHaveProperty("options")
    expect(out.models["claude-sonnet-4-5"]).not.toHaveProperty("headers")
    expect(out.models["claude-sonnet-4-5"].variants).toEqual({
      thinking: {},
      fast: { disabled: true },
    })
  })

  test("public opencode model DTO decodes through Schema", () => {
    const out = toPublicOpencodeProviderInfo(baseProvider())
    expect(() =>
      Schema.decodeUnknownSync(PublicOpencodeModelSchema)(out.models["claude-sonnet-4-5"]),
    ).not.toThrow()
  })

  test("public opencode provider DTO decodes through Schema", () => {
    const out = toPublicOpencodeProviderInfo(baseProvider())
    expect(() => Schema.decodeUnknownSync(PublicOpencodeProviderInfoSchema)(out)).not.toThrow()
  })

  test("public opencode list and config results decode through Schema", () => {
    const out = {
      all: [toPublicOpencodeProviderInfo(baseProvider())],
      default: { anthropic: "claude-sonnet-4-5" },
      connected: ["anthropic"],
    }
    expect(() => Schema.decodeUnknownSync(PublicOpencodeProviderListResultSchema)(out)).not.toThrow()
    const configResult = {
      providers: [toPublicOpencodeProviderInfo(baseProvider())],
      default: { anthropic: "claude-sonnet-4-5" },
    }
    expect(() => Schema.decodeUnknownSync(PublicOpencodeConfigProvidersResultSchema)(configResult)).not.toThrow()
  })
})