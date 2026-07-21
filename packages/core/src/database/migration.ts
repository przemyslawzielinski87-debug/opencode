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

export function apply(db: Database) {
  return lock.withPermit(
    Effect.gen(function* () {
      const tables = yield* db.all<{ name: string }>(
        sql`SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'`,
      )
      if (tables.some((table) => table.name === "session_context_epoch")) {
        yield* preflightSessionContextEpoch(db)
      }
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

const simplifySessionContextEpochID = "20260622142730_simplify_session_context_epoch"
const compatibilityColumnsID = "20260720000000_context_epoch_compatibility_columns"

const contextEpochContract = {
  table: "session_context_epoch",
  primaryKeyColumn: "session_id",
  columns: [
    { name: "session_id", type: "text", notnull: 1, dflt_value: null, pk: 1 },
    { name: "baseline", type: "text", notnull: 1, dflt_value: null, pk: 0 },
    { name: "agent", type: "text", notnull: 1, dflt_value: "'build'", pk: 0 },
    { name: "snapshot", type: "text", notnull: 1, dflt_value: null, pk: 0 },
    { name: "baseline_seq", type: "integer", notnull: 1, dflt_value: null, pk: 0 },
    { name: "replacement_seq", type: "integer", notnull: 0, dflt_value: null, pk: 0 },
    { name: "revision", type: "integer", notnull: 1, dflt_value: "0", pk: 0 },
  ] as ColumnContract[],
}

type ColumnContract = {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

type ColumnInfo = ColumnContract & { cid: number }

function preflightSessionContextEpoch(db: Database) {
  return Effect.gen(function* () {
    const table = yield* db.get<{ name: string; type: string }>(
      sql`SELECT name, type FROM sqlite_master WHERE type = 'table' AND name = ${contextEpochContract.table}`,
    )
    if (!table) return yield* Effect.die("session_context_epoch is missing from sqlite_master")
    if (table.type !== "table") return yield* Effect.die("session_context_epoch exists but is not a table")

    const actualColumns = yield* db.all<ColumnInfo>(
      sql`SELECT cid, name, type, "notnull", dflt_value, pk FROM pragma_table_info('session_context_epoch')`,
    )
    const contractResult = validateContextEpochContract(actualColumns)

    if (contractResult.kind === "incompatible") {
      return yield* Effect.die(
        `session_context_epoch has an incompatible required column shape for ${contractResult.column}: ${contractResult.reason}`,
      )
    }

    const missing = contractResult.missing
    const repairable = missing.length > 0 && missing.every((name) => name === "agent" || name === "replacement_seq" || name === "revision")
    const repairAllowed =
      repairable && (yield* hasMigration(db, simplifySessionContextEpochID)) && !(yield* hasMigration(db, compatibilityColumnsID))

    if (missing.length > 0 && !repairAllowed) {
      return yield* Effect.die(
        "session_context_epoch is missing required columns and has no recorded simplify migration; refusing to start",
      )
    }

    if (yield* hasFutureMigrationMarker(db)) {
      return yield* Effect.die(
        "session_context_epoch migration journal contains a future migration marker from a newer binary; refusing to start",
      )
    }

    if (missing.length === 0 && !(yield* hasReliableMigrationJournal(db))) {
      return yield* Effect.die(
        "session_context_epoch exists but has no reliable migration journal; refusing to start",
      )
    }
  })
}

function validateContextEpochContract(actualColumns: ColumnInfo[]) {
  const actualByName = new Map(actualColumns.map((col) => [col.name, col]))
  const missing: string[] = []

  for (const expected of contextEpochContract.columns) {
    const actual = actualByName.get(expected.name)
    if (!actual) {
      missing.push(expected.name)
      continue
    }
    const reason = columnContractMismatch(actual, expected)
    if (reason) return { kind: "incompatible" as const, column: expected.name, reason }
  }

  return { kind: "ok" as const, missing }
}

function columnContractMismatch(actual: ColumnInfo, expected: ColumnContract) {
  if (actual.type.toLowerCase() !== expected.type) return `expected type ${expected.type}, got ${actual.type}`
  if (expected.name !== contextEpochContract.primaryKeyColumn && actual.notnull !== expected.notnull) {
    return `expected notnull ${expected.notnull}, got ${actual.notnull}`
  }
  if (actual.dflt_value !== expected.dflt_value) {
    return `expected default ${expected.dflt_value}, got ${actual.dflt_value}`
  }
  if (actual.pk !== expected.pk) return `expected pk ${expected.pk}, got ${actual.pk}`
  return null
}

function hasFutureMigrationMarker(db: Database) {
  return Effect.gen(function* () {
    const knownIds = new Set(migrations.map((migration) => migration.id))
    const maxKnownId = [...knownIds].sort().at(-1) ?? ""
    const journalIds = yield* migrationJournalIds(db)
    return journalIds.some((id) => !knownIds.has(id) && id > maxKnownId)
  })
}

function hasReliableMigrationJournal(db: Database) {
  return Effect.gen(function* () {
    const migrationTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration'`,
    )
    if (migrationTable) return true
    const drizzleTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    return !!drizzleTable
  })
}

function migrationJournalIds(db: Database) {
  return Effect.gen(function* () {
    const ids: string[] = []
    const migrationTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration'`,
    )
    if (migrationTable) {
      const rows = yield* db.all<{ id: string }>(sql`SELECT id FROM migration WHERE id IS NOT NULL`)
      ids.push(...rows.map((row) => row.id))
    }
    const drizzleTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    if (drizzleTable) {
      const rows = yield* db.all<{ name: string | null }>(sql`SELECT name FROM __drizzle_migrations WHERE name IS NOT NULL`)
      ids.push(...rows.map((row) => row.name).filter((name): name is string => name !== null))
    }
    return ids
  })
}

function hasMigration(db: Database, id: string) {
  return Effect.gen(function* () {
    const migrationTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'migration'`,
    )
    if (migrationTable && (yield* db.get(sql`SELECT id FROM migration WHERE id = ${id}`))) return true

    const drizzleTable = yield* db.get<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
    )
    if (drizzleTable && (yield* db.get(sql`SELECT name FROM __drizzle_migrations WHERE name = ${id}`))) return true

    return false
  })
}
