import { describe, expect, test } from "bun:test"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { EffectDrizzleSqlite } from "@opencode-ai/effect-drizzle-sqlite"
import { DatabaseMigration } from "@opencode-ai/core/database/migration"
import { migrations } from "@opencode-ai/core/database/migration.gen"
import { Effect } from "effect"
import { sql } from "drizzle-orm"
import type { SqlClient as SqlClientService } from "effect/unstable/sql/SqlClient"

type Database = EffectDrizzleSqlite.EffectSQLiteDatabase

const makeDb = EffectDrizzleSqlite.makeWithDefaults()

const run = <A, E>(effect: Effect.Effect<A, E, SqlClientService>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(SqliteClient.layer({ filename: ":memory:", disableWAL: true })), Effect.scoped),
  )

const contextEpochColumns = ["agent", "replacement_seq", "revision"]
const addSnapshot = "20260605003541_add_session_context_snapshot"
const addAgent = "20260605042240_add_context_epoch_agent"
const simplify = "20260622142730_simplify_session_context_epoch"
const compat = "20260720000000_context_epoch_compatibility_columns"

const baseMigrationIds = migrations
  .map((migration) => migration.id)
  .filter((id) => id !== compat)

const tableColumns = (db: Database) =>
  db.all<{ name: string }>(sql`SELECT name FROM pragma_table_info('session_context_epoch')`)

const migrationIds = (db: Database) => db.all<{ id: string }>(sql`SELECT id FROM migration ORDER BY id`)

const createSession = (db: Database) =>
  db.run(
    sql`CREATE TABLE session (id text PRIMARY KEY, directory text, workspace_id text, agent text, time_created integer, time_updated integer, data text)`,
  )

const createMigrationTable = (db: Database, ids: string[]) =>
  Effect.gen(function* () {
    yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
    for (const id of ids) {
      yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES (${id}, ${Date.now()})`)
    }
  })

const createContextEpochPreSimplification = (db: Database) =>
  db.run(
    sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL, replacement_seq integer, revision integer DEFAULT 0 NOT NULL, agent text DEFAULT 'build' NOT NULL)`,
  )

const createContextEpochSimplified = (db: Database) =>
  db.run(
    sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL)`,
  )

const createContextEpochShim = (db: Database) =>
  db.run(
    sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL, replacement_seq integer, revision integer DEFAULT 0 NOT NULL, agent text DEFAULT 'build' NOT NULL)`,
  )

const createContextEpochBenignExtra = (db: Database) =>
  db.run(
    sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL, replacement_seq integer, revision integer DEFAULT 0 NOT NULL, agent text DEFAULT 'build' NOT NULL, extra_col text)`,
  )

const createContextEpochIncompatible = (db: Database) =>
  db.run(
    sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL, replacement_seq integer, revision integer DEFAULT 0 NOT NULL, agent integer NOT NULL)`,
  )

const selectEpoch = (db: Database, sessionID: string) =>
  db.get<{ agent: string; replacement_seq: number | null; revision: number }>(
    sql`SELECT agent, replacement_seq, revision FROM session_context_epoch WHERE session_id = ${sessionID}`,
  )

describe("SessionContextEpoch compatibility", () => {
  test("F0: empty database applies full schema and records compatibility migration", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* DatabaseMigration.apply(db)
        const columns = new Set((yield* tableColumns(db)).map((row) => row.name))
        for (const name of contextEpochColumns) {
          expect(columns.has(name)).toBe(true)
        }
        const migrationCount = (yield* db.get<{ count: number }>(sql`SELECT count(*) as count FROM migration`))!
        expect(migrationCount.count).toBe(migrations.length)
      }),
    )
  })

  test("F1: pre-simplification database stays unchanged and records compatibility migration", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* createSession(db)
        yield* createContextEpochPreSimplification(db)
        yield* createMigrationTable(db, baseMigrationIds)
        yield* DatabaseMigration.apply(db)
        const columns = new Set((yield* tableColumns(db)).map((row) => row.name))
        for (const name of contextEpochColumns) {
          expect(columns.has(name)).toBe(true)
        }
        const ids = (yield* migrationIds(db)).map((row) => row.id)
        expect(ids).toContain(compat)
      }),
    )
  })

  test("F2: simplified database forward-migrates compatibility columns", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* createSession(db)
        yield* createContextEpochSimplified(db)
        yield* createMigrationTable(db, [...baseMigrationIds, simplify])
        yield* DatabaseMigration.apply(db)
        const columns = new Set((yield* tableColumns(db)).map((row) => row.name))
        for (const name of contextEpochColumns) {
          expect(columns.has(name)).toBe(true)
        }
        const ids = (yield* migrationIds(db)).map((row) => row.id)
        expect(ids).toContain(compat)
      }),
    )
  })

  test("F3: production-shim database starts without data loss", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* createSession(db)
        yield* createContextEpochShim(db)
        yield* db.run(
          sql`INSERT INTO session_context_epoch (session_id, baseline, snapshot, baseline_seq, replacement_seq, revision, agent) VALUES ('s1', 'b1', '{}', 0, 5, 7, 'custom')`,
        )
        yield* createMigrationTable(db, [...baseMigrationIds, simplify])
        yield* DatabaseMigration.apply(db)
        const row = (yield* selectEpoch(db, "s1"))!
        expect(row).toEqual({ agent: "custom", replacement_seq: 5, revision: 7 })
        const ids = (yield* migrationIds(db)).map((r) => r.id)
        expect(ids).toContain(compat)
      }),
    )
  })

  test("F4: history/schema mismatch is blocked by preflight", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* createSession(db)
          yield* createContextEpochSimplified(db)
          yield* createMigrationTable(db, baseMigrationIds)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow()
  })

  test("F5: partial migration is blocked by preflight", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* createSession(db)
          yield* db.run(
            sql`CREATE TABLE session_context_epoch (session_id text PRIMARY KEY, baseline text NOT NULL, snapshot text NOT NULL, baseline_seq integer NOT NULL, replacement_seq integer, revision integer DEFAULT 0 NOT NULL)`,
          )
          yield* createMigrationTable(
            db,
            baseMigrationIds.filter((id) => id !== addAgent),
          )
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow()
  })

  test("F6: unrelated schema is rejected", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE unrelated (id text PRIMARY KEY)`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("Database is not empty and has no session table")
  })

  test("write-path stores and reads required columns", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* DatabaseMigration.apply(db)
        yield* db.run(
          sql`INSERT INTO session_context_epoch (session_id, baseline, snapshot, baseline_seq, agent, replacement_seq, revision) VALUES ('s1', 'b1', '{}', 0, 'agent-a', NULL, 0)`,
        )

        let row = (yield* selectEpoch(db, "s1"))!
        expect(row).toEqual({ agent: "agent-a", replacement_seq: null, revision: 0 })

        yield* db.run(
          sql`UPDATE session_context_epoch SET replacement_seq = 3, revision = revision + 1 WHERE session_id = 's1' AND revision = 0`,
        )

        row = (yield* selectEpoch(db, "s1"))!
        expect(row).toEqual({ agent: "agent-a", replacement_seq: 3, revision: 1 })
      }),
    )
  })

  test("F7A: benign extra column is allowed and write path works", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* createSession(db)
        yield* createContextEpochBenignExtra(db)
        yield* createMigrationTable(db, [...baseMigrationIds, simplify, compat])
        yield* DatabaseMigration.apply(db)
        const columns = new Set((yield* tableColumns(db)).map((row) => row.name))
        expect(columns.has("extra_col")).toBe(true)
        expect(columns.has("agent")).toBe(true)
        const ids = (yield* migrationIds(db)).map((row) => row.id)
        expect(ids).toContain(compat)
      }),
    )
  })

  test("F7B: future migration marker is blocked before write path", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* createSession(db)
          yield* createContextEpochShim(db)
          yield* createMigrationTable(db, [...baseMigrationIds, simplify, compat, "20261201000000_future_schema_marker"])
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("future migration marker")
  })

  test("F7C: incompatible required column shape is blocked", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* createSession(db)
          yield* createContextEpochIncompatible(db)
          yield* createMigrationTable(db, baseMigrationIds)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("incompatible required column shape")
  })

  test("F7D: unknown schema without reliable migration journal is blocked", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* createSession(db)
          yield* createContextEpochShim(db)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("no reliable migration journal")
  })
})
