export * as DatabaseMigration from "./migration"

import { sql } from "drizzle-orm"
import { Effect, Semaphore } from "effect"
import type { EffectDrizzleSqlite } from "@opencode-ai/effect-drizzle-sqlite"
import { migrations } from "./migration.gen"
import schema from "./schema.gen"

type Database = EffectDrizzleSqlite.EffectSQLiteDatabase
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]
const lock = Semaphore.makeUnsafe(1)

export type Migration = {
  id: string
  up: (tx: Transaction) => Effect.Effect<void, unknown>
}

const SESSION_CONTEXT_EPOCH_FIRST_MIGRATION = "20260605003541_add_session_context_snapshot"

type ColumnInfo = { name: string; type: string; notnull: number; pk: number }

export function apply(db: Database) {
  return lock.withPermit(
    Effect.gen(function* () {
      const tables = yield* db.all<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
      )
      yield* preflightSessionContextEpoch(db)
      if (tables.some((table) => table.name === "session")) return yield* applyOnly(db, migrations)
      if (tables.length > 0) return yield* Effect.die("Database is not empty and has no session table")
      yield* db.transaction((tx) =>
        Effect.gen(function* () {
          yield* schema.up(tx)
          yield* tx.run(
            sql`CREATE TABLE ${sql.identifier("migration")} (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`,
          )
          yield* Effect.forEach(migrations, (migration) =>
            tx.run(
              sql`INSERT INTO ${sql.identifier("migration")} (id, time_completed) VALUES (${migration.id}, ${Date.now()})`,
            ),
          )
        }),
      )
    }),
  )
}

function preflightSessionContextEpoch(db: Database) {
  return Effect.gen(function* () {
    const target = yield* db.get<{ type: string }>(
      sql`SELECT type FROM sqlite_master WHERE name = ${"session_context_epoch"} AND type IN ('table', 'view') AND name NOT LIKE 'sqlite_%'`,
    )
    if (!target) return

    if (target.type !== "table") {
      return yield* Effect.die("session_context_epoch exists but is not a table")
    }

    const columns = yield* db.all<ColumnInfo>(sql`PRAGMA table_info(session_context_epoch)`)

    const required = {
      session_id: { type: "text", notnull: 1, pk: 1 },
      baseline: { type: "text", notnull: 1, pk: 0 },
      snapshot: { type: "text", notnull: 1, pk: 0 },
      baseline_seq: { type: "integer", notnull: 1, pk: 0 },
    } as const

    for (const [name, spec] of Object.entries(required)) {
      const column = columns.find((c) => c.name === name)
      if (!column) {
        return yield* Effect.die(`session_context_epoch is missing required column: ${name}`)
      }
      const columnType = column.type.toLowerCase()
      if (columnType !== spec.type) {
        return yield* Effect.die(
          `session_context_epoch column ${name} has type ${columnType}, expected ${spec.type}`,
        )
      }
      if (column.pk === 0 && column.notnull !== spec.notnull) {
        return yield* Effect.die(`session_context_epoch column ${name} must be NOT NULL`)
      }
      if (column.pk !== spec.pk) {
        return yield* Effect.die(`session_context_epoch column ${name} must be the PRIMARY KEY`)
      }
    }

    yield* assertReliableJournal(db)
  })
}

function assertReliableJournal(db: Database) {
  return Effect.gen(function* () {
    const journalTables = yield* db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('migration', '__drizzle_migrations')`,
    )
    const hasMigration = journalTables.some((table) => table.name === "migration")
    const hasDrizzle = journalTables.some((table) => table.name === "__drizzle_migrations")
    if (!hasMigration && !hasDrizzle) {
      return yield* Effect.die("session_context_epoch exists but has no reliable migration journal")
    }

    const ids: string[] = []
    if (hasMigration) {
      const rows = yield* db.all<{ id: string }>(
        sql`SELECT id FROM ${sql.identifier("migration")} WHERE id >= ${SESSION_CONTEXT_EPOCH_FIRST_MIGRATION}`,
      )
      ids.push(...rows.map((row) => row.id))
    }
    if (hasDrizzle) {
      const rows = yield* db.all<{ id: string }>(
        sql`SELECT name as id FROM ${sql.identifier("__drizzle_migrations")} WHERE name >= ${SESSION_CONTEXT_EPOCH_FIRST_MIGRATION}`,
      )
      ids.push(...rows.map((row) => row.id))
    }

    const maxKnown = migrations[migrations.length - 1].id
    if (ids.some((id) => id > maxKnown)) {
      return yield* Effect.die("session_context_epoch migration journal contains a future migration marker")
    }

    if (!ids.includes(SESSION_CONTEXT_EPOCH_FIRST_MIGRATION)) {
      return yield* Effect.die(
        "session_context_epoch exists but its creation migration is missing from the journal",
      )
    }
  })
}

export function applyOnly(db: Database, input: Migration[]) {
  return Effect.gen(function* () {
    yield* db.run(
      sql`CREATE TABLE IF NOT EXISTS ${sql.identifier("migration")} (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`,
    )
    let completed = new Set(
      (yield* db.all<{ id: string }>(sql`SELECT id FROM ${sql.identifier("migration")}`)).map((row) => row.id),
    )
    if (completed.size === 0) {
      // Existing installs used Drizzle's migration journal. Seed the new
      // journal once so TypeScript migrations don't replay old SQL.
      if (
        yield* db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${"__drizzle_migrations"}`)
      ) {
        yield* db.run(sql`
          INSERT OR IGNORE INTO ${sql.identifier("migration")} (id, time_completed)
          SELECT name, ${Date.now()}
          FROM ${sql.identifier("__drizzle_migrations")}
          WHERE name IS NOT NULL
        `)
        completed = new Set(
          (yield* db.all<{ id: string }>(sql`SELECT id FROM ${sql.identifier("migration")}`)).map((row) => row.id),
        )
      }
    }

    for (const migration of input) {
      if (completed.has(migration.id)) continue
      yield* db.transaction((tx) =>
        Effect.gen(function* () {
          yield* migration.up(tx)
          yield* tx.run(
            sql`INSERT INTO ${sql.identifier("migration")} (id, time_completed) VALUES (${migration.id}, ${Date.now()})`,
          )
        }),
      )
    }
  })
}
