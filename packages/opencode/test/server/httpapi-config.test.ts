import { afterEach, describe, expect } from "bun:test"
import path from "path"
import { Server } from "../../src/server/server"
import { Effect, Fiber } from "effect"
import { resetDatabase } from "../fixture/db"
import { disposeAllInstances, tmpdir } from "../fixture/fixture"
import { it } from "../lib/effect"
import { waitGlobalBusEvent } from "./global-bus"

function app() {
  return Server.Default().app
}

function waitDisposed(directory: string) {
  return waitGlobalBusEvent({
    message: "timed out waiting for instance disposal",
    predicate: (event) => event.payload.type === "server.instance.disposed" && event.directory === directory,
  })
}

const tmpdirEffect = (options: Parameters<typeof tmpdir>[0]) =>
  Effect.acquireRelease(
    Effect.promise(() => tmpdir(options)),
    (tmp) => Effect.promise(() => tmp[Symbol.asyncDispose]()),
  )

afterEach(async () => {
  await disposeAllInstances()
  await resetDatabase()
})

describe("config HttpApi", () => {
  it.live(
    "serves config update through the default server app",
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({ config: { formatter: false, lsp: false } })
      const disposed = yield* waitDisposed(tmp.path).pipe(Effect.forkScoped({ startImmediately: true }))

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/config", {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              "x-opencode-directory": tmp.path,
            },
            body: JSON.stringify({ model: "anthropic/claude-sonnet-4-5", formatter: false, lsp: false }),
          }),
        ),
      )

      expect(response.status).toBe(200)
      const body = yield* Effect.promise(() => response.json())
      expect(body).toMatchObject({
        model: "anthropic/claude-sonnet-4-5",
      })
      expect(body).not.toHaveProperty("formatter")
      expect(body.lsp).toBe(false)
      expect(body).not.toHaveProperty("username")
      yield* Fiber.join(disposed)
      expect(yield* Effect.promise(() => Bun.file(path.join(tmp.path, "config.json")).json())).toMatchObject({
        model: "anthropic/claude-sonnet-4-5",
        formatter: false,
        lsp: false,
      })
    }),
  )

  it.live(
    "serves config with active provider models",
    Effect.gen(function* () {
      const tmp = yield* tmpdirEffect({
        config: {
          formatter: false,
          lsp: false,
          provider: {
            omniroute: {
              models: {
                "gpt-4o": {
                  id: "gpt-4o",
                  name: "GPT-4o",
                },
              },
            },
          },
        },
      })

      const response = yield* Effect.promise(() =>
        Promise.resolve(
          app().request("/config", {
            headers: {
              "x-opencode-directory": tmp.path,
            },
          }),
        ),
      )

      expect(response.status).toBe(200)
      const body = (yield* Effect.promise(() => response.json())) as Record<string, any>
      expect(body.provider?.omniroute?.models?.["gpt-4o"]).toMatchObject({
        id: "gpt-4o",
        name: "GPT-4o",
      })
      expect(body.provider?.omniroute?.models?.["gpt-4o"]).not.toHaveProperty("status")
    }),
  )
})
