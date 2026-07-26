import { Effect } from "effect"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { EventV2 } from "@opencode-ai/core/event"
import { ModelRouteAttestation } from "@opencode-ai/schema/v1/model-route-attestation"
import type { Provider } from "@/provider/provider"

export const hashAttestation = (canonical: string): string =>
  new Bun.CryptoHasher("sha256").update(canonical).digest("hex")

export type Context = {
  readonly sessionID: string
  readonly runID: string
  readonly assistantMessage: SessionV1.Assistant
  readonly requested: { readonly providerID: string; readonly modelID: string }
  readonly executedModel: Provider.Model
  readonly runtimeID: "native" | "ai-sdk"
  readonly observed?: ModelRouteAttestation.ObservedInput
  readonly fallback?: ModelRouteAttestation.FallbackInput
}

export const emit = Effect.fn("ModelRouteAttestation.emit")(function* (
  events: EventV2.Interface,
  input: Context,
) {
  const payload = yield* Effect.sync(() =>
    ModelRouteAttestation.buildAttestation(
      {
        session_id: input.sessionID,
        run_id: input.runID,
        message_id: input.assistantMessage.id,
        requested: {
          provider_id: input.requested.providerID,
          model_id: input.requested.modelID,
        },
        executed: {
          provider_id: input.executedModel.providerID,
          model_id: input.executedModel.id,
          runtime_id: input.runtimeID,
        },
        observed: input.observed,
        fallback: input.fallback,
      },
      hashAttestation,
    ),
  )
  yield* events.publish(SessionV1.Event.ModelRouteAttestation, payload)
  return payload
})

export * as ModelRouteAttestation from "./model-route-attestation"
