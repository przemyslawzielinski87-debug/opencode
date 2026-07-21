import { Schema } from "effect"
import { ProviderV2 } from "./provider"
import { ModelV2 } from "./model"

export type PublicProviderV2Info = typeof PublicProviderV2InfoSchema.Type

export const PublicProviderV2InfoSchema = Schema.Struct({
  id: ProviderV2.ID,
  name: Schema.String,
  disabled: Schema.optional(Schema.Boolean),
  credentialConfigured: Schema.Boolean,
})

export type PublicModelV2Info = typeof PublicModelV2InfoSchema.Type

export type PublicModelV2Variant = {
  id: ModelV2.VariantID
  disabled?: boolean
}

export const PublicModelV2VariantSchema = Schema.Struct({
  id: ModelV2.VariantID,
  disabled: Schema.optional(Schema.Boolean),
})

export const PublicModelV2InfoSchema = Schema.Struct({
  id: ModelV2.ID,
  providerID: ProviderV2.ID,
  name: Schema.String,
  family: Schema.optional(ModelV2.Family),
  capabilities: ModelV2.Capabilities,
  cost: Schema.Array(ModelV2.Cost),
  limit: Schema.Struct({
    context: Schema.Int,
    input: Schema.optional(Schema.Int),
    output: Schema.Int,
  }),
  status: ModelV2.Info.fields.status,
  enabled: Schema.Boolean,
  time: Schema.Struct({
    released: Schema.Number,
  }),
  variants: Schema.Array(PublicModelV2VariantSchema),
})

export function v2CredentialConfigured(provider: ProviderV2.Info): boolean {
  const body = provider.request?.body
  if (body && typeof body === "object") {
    if (typeof (body as Record<string, unknown>).apiKey === "string") return true
    if ((body as Record<string, unknown>).apiKey !== undefined) return true
  }
  const headers = provider.request?.headers
  if (headers && typeof headers === "object") {
    if (typeof (headers as Record<string, unknown>).Authorization === "string") return true
    if (typeof (headers as Record<string, unknown>).authorization === "string") return true
  }
  return false
}

export function toPublicProviderV2Info(input: ProviderV2.Info, credentialConfigured?: boolean): PublicProviderV2Info {
  return {
    id: input.id,
    name: input.name,
    credentialConfigured: credentialConfigured ?? v2CredentialConfigured(input),
    ...(typeof input.disabled === "boolean" ? { disabled: input.disabled } : {}),
  }
}

export function toPublicModelV2Info(input: ModelV2.Info): PublicModelV2Info {
  const cost: PublicModelV2Info["cost"][number][] = []
  if (Array.isArray(input.cost)) {
    for (const c of input.cost) {
      if (!c) continue
      cost.push({
        input: (c as { input: number }).input,
        output: (c as { output: number }).output,
        cache: {
          read: (c as { cache: { read: number; write: number } }).cache.read,
          write: (c as { cache: { read: number; write: number } }).cache.write,
        },
        ...((c as { tier?: unknown }).tier ? { tier: (c as { tier: { type: "context"; size: number } }).tier } : {}),
      })
    }
  }
  const variants: PublicModelV2Variant[] = []
  if (Array.isArray(input.variants)) {
    for (const variant of input.variants) {
      if (!variant || typeof variant.id !== "string") continue
      const v: PublicModelV2Variant = { id: variant.id }
      variants.push(v)
    }
  }
  return {
    id: input.id,
    providerID: input.providerID,
    name: input.name,
    capabilities: {
      tools: input.capabilities.tools,
      input: input.capabilities.input,
      output: input.capabilities.output,
    },
    cost,
    limit: {
      context: input.limit.context,
      output: input.limit.output,
      ...(input.limit.input !== undefined ? { input: input.limit.input } : {}),
    },
    status: input.status,
    enabled: input.enabled,
    time: { released: Date.parse(input.time.released.toString()) || 0 },
    variants,
    ...(typeof input.family === "string" ? { family: input.family as ModelV2.Family } : {}),
  }
}