import { Catalog } from "@opencode-ai/core/catalog"
import { PluginBoot } from "@opencode-ai/core/plugin/boot"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { toPublicProviderV2Info, v2CredentialConfigured } from "@opencode-ai/core/public-provider"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "../api"
import { ProviderNotFoundError, ServiceUnavailableError } from "../errors"
import { response } from "../groups/location"

const catalogUnavailable = new ServiceUnavailableError({
  message: "Provider catalog is unavailable",
  service: "catalog",
})

export const ProviderHandler = HttpApiBuilder.group(Api, "server.provider", (handlers) =>
  Effect.gen(function* () {
    return handlers
      .handle(
        "provider.list",
        Effect.fn(function* () {
          const catalog = yield* Catalog.Service
          const pluginBoot = yield* PluginBoot.Service
          yield* pluginBoot.wait().pipe(Effect.catchDefect(() => Effect.fail(catalogUnavailable)))
          return yield* response(catalog.provider.available()).pipe(
            Effect.map((envelope) => ({
              ...envelope,
              data: envelope.data.map((p) => toPublicProviderV2Info(p as ProviderV2.Info)),
            })),
          )
        }),
      )
      .handle(
        "provider.get",
        Effect.fn(function* (ctx) {
          const catalog = yield* Catalog.Service
          const pluginBoot = yield* PluginBoot.Service
          yield* pluginBoot.wait().pipe(Effect.catchDefect(() => Effect.fail(catalogUnavailable)))
          return yield* response(catalog.provider.get(ctx.params.providerID)).pipe(
            Effect.map((envelope) => ({
              ...envelope,
              data: toPublicProviderV2Info(envelope.data as ProviderV2.Info),
            })),
            Effect.catchTag("CatalogV2.ProviderNotFound", (error) =>
              Effect.fail(
                new ProviderNotFoundError({
                  providerID: error.providerID,
                  message: `Provider not found: ${error.providerID}`,
                }),
              ),
            ),
          )
        }),
      )
  }),
)
void v2CredentialConfigured
