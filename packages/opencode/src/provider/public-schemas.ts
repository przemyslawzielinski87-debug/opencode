import { Schema } from "effect"
import { ProviderV2 } from "@opencode-ai/core/provider"

const ProviderModalities = Schema.Struct({
  text: Schema.Boolean,
  audio: Schema.Boolean,
  image: Schema.Boolean,
  video: Schema.Boolean,
  pdf: Schema.Boolean,
})

const ProviderInterleaved = Schema.Union([
  Schema.Boolean,
  Schema.Struct({
    field: Schema.Literals(["reasoning", "reasoning_content", "reasoning_details"]),
  }),
])

const ProviderCapabilities = Schema.Struct({
  temperature: Schema.Boolean,
  reasoning: Schema.Boolean,
  attachment: Schema.Boolean,
  toolcall: Schema.Boolean,
  input: ProviderModalities,
  output: ProviderModalities,
  interleaved: ProviderInterleaved,
})

const ProviderCacheCost = Schema.Struct({
  read: Schema.Finite,
  write: Schema.Finite,
})

const ProviderCost = Schema.Struct({
  input: Schema.Finite,
  output: Schema.Finite,
  cache: ProviderCacheCost,
})

const ProviderLimit = Schema.Struct({
  context: Schema.Finite,
  input: Schema.optional(Schema.Finite),
  output: Schema.Finite,
})

const ModelStatus = Schema.Literals(["alpha", "beta", "deprecated", "active"])

export type PublicOpencodeModel = {
  id: string
  providerID: ProviderV2.ID
  name: string
  family?: string
  status: typeof ModelStatus.Type
  release_date: string
  capabilities: typeof ProviderCapabilities.Type
  cost: typeof ProviderCost.Type
  limit: typeof ProviderLimit.Type
  variants: Record<string, PublicOpencodeVariant>
}

export type PublicOpencodeVariant = {
  disabled?: boolean
}

export const PublicOpencodeVariantSchema = Schema.Struct({
  disabled: Schema.optional(Schema.Boolean),
})

export const PublicOpencodeModelSchema = Schema.Struct({
  id: Schema.String,
  providerID: ProviderV2.ID,
  name: Schema.String,
  family: Schema.optional(Schema.String),
  status: ModelStatus,
  release_date: Schema.String,
  capabilities: ProviderCapabilities,
  cost: ProviderCost,
  limit: ProviderLimit,
  variants: Schema.Record(Schema.String, PublicOpencodeVariantSchema),
})

export type PublicOpencodeProviderInfo = {
  id: ProviderV2.ID
  name: string
  source: "env" | "config" | "custom" | "api"
  credentialConfigured: boolean
  models: Record<string, PublicOpencodeModel>
}

export const PublicOpencodeProviderInfoSchema = Schema.Struct({
  id: ProviderV2.ID,
  name: Schema.String,
  source: Schema.Literals(["env", "config", "custom", "api"]),
  credentialConfigured: Schema.Boolean,
  models: Schema.Record(Schema.String, PublicOpencodeModelSchema),
})

export type PublicOpencodeProviderListResult = {
  all: PublicOpencodeProviderInfo[]
  default: Record<string, string>
  connected: string[]
}

export const PublicOpencodeProviderListResultSchema = Schema.Struct({
  all: Schema.Array(PublicOpencodeProviderInfoSchema),
  default: Schema.Record(Schema.String, Schema.String),
  connected: Schema.Array(Schema.String),
})

export type PublicOpencodeConfigProvidersResult = {
  providers: PublicOpencodeProviderInfo[]
  default: Record<string, string>
}

export const PublicOpencodeConfigProvidersResultSchema = Schema.Struct({
  providers: Schema.Array(PublicOpencodeProviderInfoSchema),
  default: Schema.Record(Schema.String, Schema.String),
})