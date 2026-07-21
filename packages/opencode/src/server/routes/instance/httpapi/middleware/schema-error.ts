import { Effect } from "effect"
import { HttpServerResponse } from "effect/unstable/http"
import { HttpApiMiddleware } from "effect/unstable/httpapi"
import { InvalidRequestError } from "../errors"

function stripActualValues(reason: string): string {
  let out = reason
  out = out.replace(
    /\bactual\b[^\n,;{}()\[\]]{0,32}?(\{[\s\S]*?\}|\[[\s\S]*?\]|"[^"\n]*"|'[^'\n]*'|-?\d+(?:\.\d+)?)/g,
    "actual: <redacted>",
  )
  out = out.replace(/\bexpected\b[^\n,;{}()\[\]]{0,32}?(\{[\s\S]*?\}|\[[\s\S]*?\])/g, "expected: <redacted>")
  out = out.replace(/\bgot\s+(?:"[^"\n]*"|'[^'\n]*'|\{[\s\S]*?\}|\[[\s\S]*?\])/g, "got <redacted>")
  out = out.replace(
    /\b(?:apiKey|api_key|token|accessToken|refreshToken|PAT|password|secret|clientSecret|privateKey|Authorization|Cookie|headers?|environment|options|request|body|initialization)["']?\s*[:=]\s*(?:\{[\s\S]*?\}|\[[\s\S]*?\]|"[^"\n]*"|'[^'\n]*'|-?\d+(?:\.\d+)?)/gi,
    (match) => {
      const idx = match.search(/[:=]/)
      if (idx === -1) return "<redacted>"
      const key = match.slice(0, idx + 1)
      return `${key} "<redacted>"`
    },
  )
  return out
}

export { stripActualValues }

export class SchemaErrorMiddleware extends HttpApiMiddleware.Service<SchemaErrorMiddleware>()(
  "@opencode/HttpApiSchemaError",
  {
    error: InvalidRequestError,
  },
) {}

export const schemaErrorLayer = HttpApiMiddleware.layerSchemaErrorTransform(SchemaErrorMiddleware, (error, context) => {
  const reason = "Invalid request"
  const response = context.endpoint.path.startsWith("/api/")
    ? Effect.fail(
        new InvalidRequestError({
          message: reason,
          kind: error.kind,
        }),
      )
    : Effect.succeed(
        HttpServerResponse.jsonUnsafe(
          { name: "BadRequest", data: { message: reason, kind: error.kind } },
          { status: 400 },
        ),
      )
  return Effect.logWarning("schema rejection", { kind: error.kind }).pipe(Effect.andThen(response))
})
