import { ProviderV2 } from "@opencode-ai/core/provider"
import { Provider, Model, type Info } from "./provider"
import {
  PublicOpencodeProviderInfoSchema,
  PublicOpencodeProviderListResultSchema,
  PublicOpencodeConfigProvidersResultSchema,
  PublicOpencodeModelSchema,
  PublicOpencodeVariantSchema,
  type PublicOpencodeModel,
  type PublicOpencodeVariant,
  type PublicOpencodeProviderInfo,
  type PublicOpencodeProviderListResult,
  type PublicOpencodeConfigProvidersResult,
} from "./public-schemas"

export {
  PublicOpencodeProviderInfoSchema,
  PublicOpencodeProviderListResultSchema,
  PublicOpencodeConfigProvidersResultSchema,
  PublicOpencodeModelSchema,
  PublicOpencodeVariantSchema,
  type PublicOpencodeModel,
  type PublicOpencodeVariant,
  type PublicOpencodeProviderInfo,
  type PublicOpencodeProviderListResult,
  type PublicOpencodeConfigProvidersResult,
}

export function pickOpencodeModel(model: Model): PublicOpencodeModel {
  const out: PublicOpencodeModel = {
    id: model.id,
    providerID: model.providerID,
    name: model.name,
    status: model.status,
    release_date: model.release_date,
    capabilities: model.capabilities,
    cost: model.cost,
    limit: model.limit,
    variants: {},
  }
  if (typeof model.family === "string") out.family = model.family
  if (model.variants) {
    for (const [id, variant] of Object.entries(model.variants)) {
      if (!variant || typeof variant !== "object") continue
      const v: PublicOpencodeVariant = {}
      if ((variant as { disabled?: unknown }).disabled === true) {
        v.disabled = true
      }
      out.variants[id] = v
    }
  }
  return out
}

export interface OpencodePublicProviderOptions {
  credentialConfigured?: (providerID: ProviderV2.ID) => boolean
}

export function opencodeCredentialConfigured(provider: Info): boolean {
  if (typeof provider.key === "string" && provider.key.length > 0) return true
  const options = provider.options
  if (options && typeof options === "object") {
    if (typeof (options as Record<string, unknown>).apiKey === "string") return true
    if ((options as Record<string, unknown>).apiKey !== undefined) return true
  }
  return false
}

export function toPublicOpencodeProviderInfo(
  input: Info,
  options: OpencodePublicProviderOptions = {},
): PublicOpencodeProviderInfo {
  const models: Record<string, PublicOpencodeModel> = {}
  for (const [id, model] of Object.entries(input.models)) {
    models[id] = pickOpencodeModel(model)
  }
  const credentialConfigured = options.credentialConfigured
    ? options.credentialConfigured(input.id)
    : opencodeCredentialConfigured(input)
  return {
    id: input.id,
    name: input.name,
    source: input.source,
    credentialConfigured,
    models,
  }
}