import { NodeHttpServer } from "@effect/platform-node"
import { describe, expect } from "bun:test"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import {
  FORBIDDEN_PROPERTY_NAMES,
  PublicConfigSchema,
  toPublicConfig,
} from "@opencode-ai/core/v1/config/public"
import { Effect, Layer, Option } from "effect"
import { HttpClient, HttpClientRequest, HttpRouter } from "effect/unstable/http"
import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi"
import { ServerAuth } from "../../src/server/auth"
import {
  Authorization,
  authorizationLayer,
} from "../../src/server/routes/instance/httpapi/middleware/authorization"
import { testEffect } from "../lib/effect"

const SENTINEL = "sentinel-token-CANARY-auth-config-7f3e"

const input: ConfigV1.Info = {
  shell: "/bin/zsh",
  model: "demo/model",
  provider: {
    demo: {
      name: "Demo",
      options: { apiKey: SENTINEL, headers: { Authorization: SENTINEL } },
      models: {
        model: {
          name: "Model",
          options: { token: SENTINEL },
        },
      },
    },
  },
  mcp: {
    demo: {
      type: "local",
      command: ["demo", SENTINEL],
      environment: { API_KEY: SENTINEL },
      enabled: true,
    },
  },
  lsp: {
    demo: {
      command: ["demo-lsp"],
      env: { API_KEY: SENTINEL },
      initialization: { token: SENTINEL },
    },
  },
  plugin: [["demo-plugin", { token: SENTINEL }]],
  permission: { bash: { [SENTINEL]: "ask" } },
}

const Api = HttpApi.make("test-config-auth").add(
  HttpApiGroup.make("config-probe")
    .add(HttpApiEndpoint.get("get", "/config", { success: PublicConfigSchema }))
    .middleware(Authorization),
)

const handlers = HttpApiBuilder.group(Api, "config-probe", (handlers) =>
  handlers.handle("get", () =>
    Effect.succeed(
      toPublicConfig(input, {
        credentialConfigured: () => true,
      }),
    ),
  ),
)

const apiLayer = HttpRouter.serve(
  HttpApiBuilder.layer(Api).pipe(Layer.provide(handlers), Layer.provide(authorizationLayer)),
  { disableListenLog: true, disableLogger: true },
).pipe(Layer.provideMerge(NodeHttpServer.layerTest))

const noAuthLayer = ServerAuth.Config.layer({ password: Option.none(), username: "opencode" })
const secretLayer = ServerAuth.Config.layer({ password: Option.some("test-password"), username: "opencode" })
const itNoAuth = testEffect(apiLayer.pipe(Layer.provide(noAuthLayer)))
const itSecret = testEffect(apiLayer.pipe(Layer.provide(secretLayer)))

function getConfig(authorization?: string) {
  return HttpClientRequest.get("/config").pipe(
    authorization ? HttpClientRequest.setHeader("authorization", authorization) : (request) => request,
    HttpClient.execute,
  )
}

function assertSanitized(body: unknown) {
  const text = JSON.stringify(body)
  expect(text).not.toContain(SENTINEL)
  for (const key of FORBIDDEN_PROPERTY_NAMES) expect(text).not.toContain(`"${key}"`)
  expect(body).toMatchObject({
    shell: "/bin/zsh",
    model: "demo/model",
    provider: { demo: { credentialConfigured: true } },
    mcp: { demo: { enabled: true } },
    lsp: { demo: { enabled: true } },
    plugin: ["demo-plugin"],
    permission: { bash: "ask" },
  })
}

describe("authenticated and unauthenticated /config projection", () => {
  itNoAuth.live("sanitizes /config when server auth is disabled", () =>
    Effect.gen(function* () {
      const response = yield* getConfig()
      expect(response.status).toBe(200)
      assertSanitized(yield* response.json)
    }),
  )

  itSecret.live("requires configured credentials", () =>
    Effect.gen(function* () {
      expect((yield* getConfig()).status).toBe(401)
      expect((yield* getConfig(ServerAuth.header({ password: "wrong" }))).status).toBe(401)
    }),
  )

  itSecret.live("sanitizes /config after successful authentication", () =>
    Effect.gen(function* () {
      const response = yield* getConfig(ServerAuth.header({ password: "test-password" }))
      expect(response.status).toBe(200)
      assertSanitized(yield* response.json)
    }),
  )
})
