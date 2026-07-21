import { describe, expect, test } from "bun:test"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import {
  toPublicConfig,
  PublicConfigSchema,
  FORBIDDEN_PROPERTY_NAMES,
  assertNoForbiddenPropertyNames,
  type PublicConfig,
} from "@opencode-ai/core/v1/config/public"

const SENTINEL_API_KEY = "sentinel-AKIAIOSFODNN7EXAMPLE-CANARY-9c2f"
const SENTINEL_TOKEN = "sentinel-token-CANARY-1f2e3d4c5b6a"
const SENTINEL_BEARER = "sentinel-Bearer-CANARY-9z8y7x"
const SENTINEL_PASSWORD = "sentinel-pwd-CANARY-p@ssw0rd"

const alwaysNotConfigured = () => false
const alwaysConfigured = () => true

describe("public Config DTO allowlist", () => {
  test("forbidden property names list covers the contract", () => {
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("apiKey")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("api_key")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("token")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("Authorization")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("headers")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("environment")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("options")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("body")
    expect(FORBIDDEN_PROPERTY_NAMES).toContain("initialization")
  })

  test("runtime sentinel apiKey never appears in the public response", () => {
    const input: ConfigV1.Info = {
      $schema: "https://opencode.ai/config.json",
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
            setCacheKey: true,
          },
          models: {
            "claude-sonnet-4-5": {
              id: "claude-sonnet-4-5",
              name: "Claude Sonnet 4.5",
              status: "active",
              options: { extraBody: { apiKey: SENTINEL_API_KEY } },
              headers: { Authorization: SENTINEL_BEARER },
              variants: {
                reasoning: {
                  budget_tokens: 4096,
                  disabled: false,
                },
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
      plugin: [
        "my-plugin",
        ["tuple-plugin", { token: SENTINEL_TOKEN }],
      ],
      permission: {
        bash: "ask",
        "*": "allow",
        custom_pattern_user_data: { "*": "deny" as const },
        another_unknown: { ask: "deny" } as Record<string, "allow" | "ask" | "deny">,
      },
      experimental: {
        disable_paste_summary: true,
        batch_tool: true,
      },
      username: "tester",
      default_agent: "build",
      small_model: "anthropic/claude-haiku-4-5",
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysConfigured })
    const json = JSON.stringify(out)
    expect(json).not.toContain(SENTINEL_API_KEY)
    expect(json).not.toContain(SENTINEL_TOKEN)
    expect(json).not.toContain(SENTINEL_BEARER)
    expect(json).not.toContain(SENTINEL_PASSWORD)
    // Closed-allowlist: removed top-level fields must not surface.
    expect(out).not.toHaveProperty("$schema")
    expect(out).not.toHaveProperty("small_model")
    expect(out).not.toHaveProperty("default_agent")
    expect(out).not.toHaveProperty("username")
    expect(out).not.toHaveProperty("enabled_providers")
    expect(out.provider?.anthropic).not.toHaveProperty("enabled")
    expect(out.provider?.anthropic?.credentialConfigured).toBe(true)
    expect(out.provider?.anthropic?.npm).toBe("@ai-sdk/anthropic")
    expect(out.provider?.anthropic?.name).toBe("Anthropic")
    expect(out.provider?.anthropic?.models?.["claude-sonnet-4-5"]).toMatchObject({
      id: "claude-sonnet-4-5",
      name: "Claude Sonnet 4.5",
    })
    expect(out.provider?.anthropic?.models?.["claude-sonnet-4-5"]).not.toHaveProperty("options")
    expect(out.provider?.anthropic?.models?.["claude-sonnet-4-5"]).not.toHaveProperty("headers")
    expect(out.provider?.anthropic?.models?.["claude-sonnet-4-5"]).not.toHaveProperty("status")
    expect(out.mcp?.leaky).toEqual({ enabled: true })
    expect(out.mcp?.leaky).not.toHaveProperty("command")
    expect(out.mcp?.leaky).not.toHaveProperty("environment")
    const lsp = out.lsp as Record<string, PublicConfig["lsp"] extends infer T ? T : never> | undefined
    const lspRust = (lsp && !Array.isArray(lsp) && typeof lsp !== "boolean" ? lsp.rust : undefined) as
      | { enabled: boolean }
      | undefined
    expect(lspRust).toEqual({ enabled: true })
    expect(lspRust).not.toHaveProperty("command")
    expect(lspRust).not.toHaveProperty("env")
    expect(lspRust).not.toHaveProperty("initialization")
    expect(out.plugin).toEqual(["my-plugin", "tuple-plugin"])
    expect(out.permission).toBeDefined()
    expect(out.permission).not.toHaveProperty("custom_pattern_user_data")
    expect(out.permission).not.toHaveProperty("another_unknown")
    expect(out.permission).toMatchObject({ bash: "ask", "*": "allow" })
    expect(out.experimental).toEqual({ disable_paste_summary: true })
    expect(out.experimental).not.toHaveProperty("batch_tool")
  })

  test("disabled LSP entry projects to { enabled: false }", () => {
    const input: ConfigV1.Info = {
      lsp: {
        rust: { disabled: true },
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.lsp).toEqual({ rust: { enabled: false } })
  })

  test("permission rule with deny-wins collapses to scalar deny", () => {
    const input: ConfigV1.Info = {
      permission: {
        bash: { "rm -rf *": "deny" as const, "*": "allow" as const },
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.permission?.bash).toBe("deny")
  })

  test("permission rule with ask-wins (no deny) collapses to scalar ask", () => {
    const input: ConfigV1.Info = {
      permission: {
        bash: { "git push*": "ask" as const, "*": "allow" as const },
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.permission?.bash).toBe("ask")
  })

  test("credentialConfigured reflects auth presence per provider", () => {
    const input: ConfigV1.Info = {
      provider: {
        anthropic: { name: "Anthropic" },
        openai: { name: "OpenAI" },
      },
    }
    const out = toPublicConfig(input, {
      credentialConfigured: (id) => id === "anthropic",
    })
    expect(out.provider?.anthropic?.credentialConfigured).toBe(true)
    expect(out.provider?.openai?.credentialConfigured).toBe(false)
  })

  test("plugin tuple without options is normalized to a string id", () => {
    const input: ConfigV1.Info = {
      plugin: ["plain-string", ["with-options", { token: SENTINEL_TOKEN }]],
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.plugin).toEqual(["plain-string", "with-options"])
    const json = JSON.stringify(out)
    expect(json).not.toContain(SENTINEL_TOKEN)
  })

  test("only recognized permission keys survive the filter", () => {
    const input: ConfigV1.Info = {
      permission: {
        bash: "allow",
        edit: "deny",
        unknown_user_key: "ask",
        nested_object: { read: "ask" as const },
        another_arbitrary: { "*": "ask" as const } as Record<string, "allow" | "ask" | "deny">,
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    const perm = out.permission as Record<string, unknown>
    expect(Object.keys(perm).sort()).toEqual(["bash", "edit"])
    expect(perm).not.toHaveProperty("unknown_user_key")
    expect(perm).not.toHaveProperty("nested_object")
    expect(perm).not.toHaveProperty("another_arbitrary")
  })

  test("permission wildcard star key is preserved alongside recognized keys", () => {
    const input: ConfigV1.Info = {
      permission: {
        "*": "ask",
        bash: "allow",
        unknown_user_key: "deny",
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    const perm = out.permission as Record<string, unknown>
    expect(perm).toMatchObject({ "*": "ask", bash: "allow" })
    expect(perm).not.toHaveProperty("unknown_user_key")
  })

  test("disabled LSP entries project to { enabled: false }, command entries to { enabled: true }", () => {
    const input: ConfigV1.Info = {
      lsp: {
        rust: { disabled: true },
        typescript: { command: ["/bin/ts-ls"] },
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.lsp).toEqual({
      rust: { enabled: false },
      typescript: { enabled: true },
    })
  })

  test("boolean lsp config passes through", () => {
    const input: ConfigV1.Info = { lsp: false }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.lsp).toBe(false)
  })

  test("empty config projects to empty public config", () => {
    const out = toPublicConfig({}, { credentialConfigured: alwaysNotConfigured })
    expect(out).toEqual({})
  })

  test("mcp enabled-only entry without type is preserved", () => {
    const input: ConfigV1.Info = {
      mcp: {
        flag: { enabled: false },
      },
    }
    const out = toPublicConfig(input, { credentialConfigured: alwaysNotConfigured })
    expect(out.mcp).toEqual({ flag: { enabled: false } })
  })

  test("public config round-trips through Schema decoder", () => {
    const sample: PublicConfig = {
      shell: "/bin/bash",
      model: "anthropic/claude-sonnet-4-5",
      share: "manual",
      disabled_providers: ["openai"],
      provider: {
        anthropic: {
          name: "Anthropic",
          npm: "@ai-sdk/anthropic",
          credentialConfigured: true,
          models: { "claude-sonnet-4-5": { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" } },
        },
      },
      mcp: { localOne: { enabled: true } },
      lsp: { rust: { enabled: false } },
      plugin: ["plugin-a"],
      permission: { bash: "ask" },
      experimental: { disable_paste_summary: false },
    }
    expect(() => PublicConfigSchema.make(sample)).not.toThrow()
  })

  test("public config schema rejects removed fields", () => {
    // Closed schema: a stray field on a plain object is dropped on .make()
    // (the projector never carries it through). Verify each removed field is
    // absent from the round-tripped output rather than expecting a throw,
    // because Effect's Schema.make silently filters unknown keys.
    const samples = [
      { $schema: "https://opencode.ai/config.json" },
      { username: "tester" },
      { small_model: "anthropic/claude-haiku-4-5" },
      { default_agent: "build" },
      { enabled_providers: ["anthropic"] },
    ]
    for (const sample of samples) {
      const projected = PublicConfigSchema.make(sample as PublicConfig) as Record<string, unknown>
      for (const key of Object.keys(sample)) {
        expect(projected).not.toHaveProperty(key)
      }
    }
  })

  test("assertNoForbiddenPropertyNames rejects forbidden keys at any depth", () => {
    expect(() =>
      assertNoForbiddenPropertyNames({
        ok: true,
        headers: { Authorization: "Bearer x" },
      }),
    ).toThrow(/forbidden property name at headers/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        provider: {
          anthropic: {
            options: { apiKey: "x" },
          },
        },
      }),
    ).toThrow(/forbidden property name at provider\.anthropic/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        list: [
          { body: { secret: "x" } },
        ],
      }),
    ).toThrow(/forbidden property name at list\.0\.body/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        headers: { "X-Custom": "ok" },
      }),
    ).toThrow(/forbidden property name at headers/)
  })

  test("assertNoForbiddenPropertyNames rejects synthetic object/array nested under permitted keys", () => {
    expect(() =>
      assertNoForbiddenPropertyNames({
        options: {
          apiKey: SENTINEL_API_KEY,
          nested: { Authorization: SENTINEL_BEARER },
        },
      }),
    ).toThrow(/forbidden property name at options/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        lsp: {
          rust: {
            env: { apiKey: SENTINEL_API_KEY },
          },
        },
      }),
    ).toThrow(/forbidden property name at lsp\.rust\.env/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        plugin: ["my-plugin", { token: SENTINEL_TOKEN }],
      }),
    ).toThrow(/forbidden property name at plugin\.1/)
    expect(() =>
      assertNoForbiddenPropertyNames({
        permission: {
          bash: { Authorization: SENTINEL_BEARER } as Record<string, unknown>,
        },
      }),
    ).toThrow(/forbidden property name at permission\.bash/)
  })
})