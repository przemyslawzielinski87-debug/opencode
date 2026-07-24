import { describe, expect, test } from "bun:test"
import { Effect, Stream } from "effect"
import { EventV2 } from "@opencode-ai/core/event"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { Provider } from "@/provider/provider"
import { ModelRouteAttestation } from "../../src/session/model-route-attestation"

const ModelRouteAttestationTestBridge = {
  events: [] as Record<string, unknown>[],
  push(event: Record<string, unknown>) {
    this.events.push(event)
  },
  reset() {
    this.events = []
  },
}

const fakeEvents = (): EventV2.Interface =>
  ({
    publish: <D extends EventV2.Definition>(_definition: D, data: EventV2.Data<D>) =>
      Effect.sync(() => {
        ModelRouteAttestationTestBridge.push(data as Record<string, unknown>)
      }).pipe(Effect.as(null as unknown as EventV2.Payload<D>)),
    subscribe: () => Stream.empty,
    all: () => Stream.empty,
    durable: () => Stream.empty,
    listen: () => Effect.succeed(() => Effect.void),
    project: () => Effect.void,
    replay: () => Effect.void,
    replayAll: () => Effect.succeed(undefined),
    remove: () => Effect.void,
    claim: () => Effect.void,
  }) as unknown as EventV2.Interface

describe("ModelRouteAttestation.emit", () => {
  test("publishes a model.route.attestation event", async () => {
    ModelRouteAttestationTestBridge.reset()
    const assistantMessage = { id: "msg_test" } as SessionV1.Assistant
    const executedModel = { providerID: "exec-provider", id: "exec-model" } as Provider.Model

    await Effect.runPromise(
      ModelRouteAttestation.emit(fakeEvents(), {
        sessionID: "ses_test",
        runID: "run_test",
        assistantMessage,
        requested: { providerID: "req-provider", modelID: "req-model" },
        executedModel,
        runtimeID: "ai-sdk",
      }),
    )

    expect(ModelRouteAttestationTestBridge.events).toHaveLength(1)
    expect(ModelRouteAttestationTestBridge.events[0]).toMatchObject({
      type: "model.route.attestation",
      session_id: "ses_test",
      run_id: "run_test",
      message_id: "msg_test",
      requested: { provider_id: "req-provider", model_id: "req-model" },
      executed: { provider_id: "exec-provider", model_id: "exec-model", runtime_id: "ai-sdk" },
      identity: { level: "MISMATCH_DETECTED" },
      fallback: { used: false },
    })
  })
})
