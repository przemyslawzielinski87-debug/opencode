#!/usr/bin/env bun
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

import { $ } from "bun"
import path from "path"

import { createClient } from "@hey-api/openapi-ts"

const opencode = path.resolve(dir, "../../opencode")

await $`bun dev generate > ${dir}/openapi.json`.cwd(opencode)

await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/v2/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "OpencodeClient",
      exportFromIndex: false,
      auth: false,
      paramsStructure: "flat",
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:4096",
    },
  ],
})

// Patch a @hey-api/openapi-ts codegen bug: SseFn incorrectly passes the
// endpoint's TError into the second generic of ServerSentEventsResult, which
// is the AsyncGenerator's TReturn slot. Iterator return values have nothing
// to do with HTTP errors, and any consumer that calls `.return()` or returns
// from a mock generator gets type-checked against the wrong shape. Drop the
// arg so TReturn defaults to void.
const sseTypesPath = "./src/v2/gen/client/types.gen.ts"
const sseTypesFile = Bun.file(sseTypesPath)
const sseTypesSource = await sseTypesFile.text()
const sseTypesPatched = sseTypesSource.replace(
  "=> Promise<ServerSentEventsResult<TData, TError>>",
  "=> Promise<ServerSentEventsResult<TData>>",
)
if (sseTypesPatched === sseTypesSource) {
  throw new Error(`SseFn patch did not apply; @hey-api/openapi-ts output may have changed (${sseTypesPath})`)
}
await Bun.write(sseTypesPath, sseTypesPatched)

// ponytail: minimal v2 SDK aliases kept for TUI/plugin consumers. Mirrors the
// public sanitized wire contract surfaced via /config/providers and /provider
// (id/name/source/models + per-model id/name/family/status/release_date/
// capabilities/cost/limit/variants). No credential-shaped fields and no open
// index signature, so accidental access to key/env/options/request/headers/
// variant internals is a compile error. Re-appends after every regeneration
// so the shim survives `clean: true`. Detail shapes (capabilities, cost,
// limit, variants) are typed `any` because the v1 OpenCode shape (object)
// and v2 catalog shape (array) diverge; consumers read the well-known fields
// either way.
const v2TypesPath = "./src/v2/gen/types.gen.ts"
const v2TypesSource = await Bun.file(v2TypesPath).text()
const v2ShimMarker = "// ponytail:v2-shim"
const v2Shim = `

${v2ShimMarker}
export type Provider = {
  id: string
  name: string
  source?: string
  credentialConfigured?: boolean
  models?: any
}
export type Model = {
  id: string
  providerID?: string
  name: string
  family?: string
  status?: string
  release_date?: string
  capabilities?: any
  cost?: any
  limit?: any
  variants?: any
}
export type ProviderV2 = Provider
export type ModelV2 = Model

// ponytail: TUI context/data.tsx imports ModelV2Info/ProviderV2Info as a type
// annotation only (no deep field access). Alias them to the same public shape
// so consumers compile without introducing internal v2 fields.
export type ProviderV2Info = Provider
export type ModelV2Info = Model
`
if (v2TypesSource.includes(v2ShimMarker)) {
  const stripped = v2TypesSource.slice(0, v2TypesSource.indexOf(v2ShimMarker))
  await Bun.write(v2TypesPath, stripped + v2Shim)
} else {
  await Bun.write(v2TypesPath, v2TypesSource + v2Shim)
}

await $`bun prettier --write src/gen`
await $`bun prettier --write src/v2`
await $`rm -rf dist`
await $`bun tsc`
await $`rm openapi.json`
