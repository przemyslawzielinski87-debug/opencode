import { sql } from "drizzle-orm"
import { Effect } from "effect"
import type { DatabaseMigration } from "../migration"

export default {
  id: "20260720000000_context_epoch_compatibility_columns",
  up(tx) {
    return Effect.gen(function* () {
      const table = yield* tx.get<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_context_epoch'`,
      )
      if (!table) return

      const columns = new Set(
        (yield* tx.all<{ name: string }>(sql`SELECT name FROM pragma_table_info('session_context_epoch')`)).map(
          (row) => row.name,
        ),
      )

      if (!columns.has("agent")) {
        yield* tx.run(sql`ALTER TABLE "session_context_epoch" ADD "agent" text DEFAULT 'build' NOT NULL`)
      }

      if (!columns.has("replacement_seq")) {
        yield* tx.run(sql`ALTER TABLE "session_context_epoch" ADD "replacement_seq" integer`)
      }

      if (!columns.has("revision")) {
        yield* tx.run(sql`ALTER TABLE "session_context_epoch" ADD "revision" integer DEFAULT 0 NOT NULL`)
      }
    })
  },
} satisfies DatabaseMigration.Migration
