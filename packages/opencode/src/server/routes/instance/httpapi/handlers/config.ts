import { Config } from "@/config/config"
import { Provider } from "@/provider/provider"
import * as InstanceState from "@/effect/instance-state"
import { Auth } from "@/auth"
import { toPublicConfig } from "@opencode-ai/core/v1/config/public"
import { toPublicOpencodeProviderInfo } from "@/provider/public"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { markInstanceForDisposal } from "../lifecycle"

function buildConfigProvidersResult(
  providers: Record<ProviderV2.ID, Provider.Info>,
  authSet: Set<string>,
): Provider.ConfigProvidersResult {
  return {
    providers: Object.values(providers).map((info) =>
      toPublicOpencodeProviderInfo(info, {
        credentialConfigured: (id) => authSet.has(id),
      }),
    ),
    default: Provider.defaultModelIDs(providers),
  }
}

export const configHandlers = HttpApiBuilder.group(InstanceHttpApi, "config", (handlers) =>
  Effect.gen(function* () {
    const providerSvc = yield* Provider.Service
    const configSvc = yield* Config.Service
    const authSvc = yield* Auth.Service

    const get = Effect.fn("ConfigHttpApi.get")(function* () {
      const info = yield* configSvc.get()
      const auths = yield* authSvc.all().pipe(Effect.orDie)
      const authSet = new Set(Object.keys(auths))
      return toPublicConfig(info, {
        credentialConfigured: (id) => authSet.has(id),
      })
    })

    const update = Effect.fn("ConfigHttpApi.update")(function* (ctx) {
      const merged = yield* configSvc.update(ctx.payload)
      const auths = yield* authSvc.all().pipe(Effect.orDie)
      const authSet = new Set(Object.keys(auths))
      const result = toPublicConfig(merged, {
        credentialConfigured: (id) => authSet.has(id),
      })
      yield* markInstanceForDisposal(yield* InstanceState.context)
      return result
    })

    const providers = Effect.fn("ConfigHttpApi.providers")(function* () {
      const providers = yield* providerSvc.list()
      const auths = yield* authSvc.all().pipe(Effect.orDie)
      const authSet = new Set(Object.keys(auths))
      return buildConfigProvidersResult(providers, authSet)
    })

    return handlers.handle("get", get).handle("update", update).handle("providers", providers)
  }),
)