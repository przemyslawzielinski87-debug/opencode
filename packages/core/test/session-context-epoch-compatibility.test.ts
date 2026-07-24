import { describe, expect, test } from "bun:test"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import { EffectDrizzleSqlite } from "@opencode-ai/effect-drizzle-sqlite"
import { Effect } from "effect"
import { sql } from "drizzle-orm"
import { DatabaseMigration } from "@opencode-ai/core/database/migration"
import { migrations } from "@opencode-ai/core/database/migration.gen"
import type { SqlClient as SqlClientService } from "effect/unstable/sql/SqlClient"

const run = <A, E>(effect: Effect.Effect<A, E, SqlClientService>) =>
  Effect.runPromise(
    effect.pipe(Effect.provide(SqliteClient.layer({ filename: ":memory:", disableWAL: true })), Effect.scoped),
  )

const makeDb = EffectDrizzleSqlite.makeWithDefaults()

const createSessionContextEpochTable = `CREATE TABLE session_context_epoch (
  session_id text PRIMARY KEY,
  baseline text NOT NULL,
  snapshot text NOT NULL,
  baseline_seq integer NOT NULL
)`

describe("session_context_epoch preflight", () => {
  test("empty database with an unrelated view still initializes", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* db.run(sql`CREATE VIEW unrelated AS SELECT 1 AS id`)
        yield* DatabaseMigration.apply(db)

        expect(
          yield* db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_context_epoch'`),
        ).toEqual({ name: "session_context_epoch" })
      }),
    )
  })

  test("rejects session_context_epoch when it exists as a view", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE VIEW session_context_epoch AS SELECT 1 AS session_id`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch exists but is not a table")
  })

  test("existing session database without session_context_epoch migrates normally", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* db.run(sql`CREATE TABLE session (id text PRIMARY KEY)`)
        yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
        for (const migration of migrations) {
          yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES (${migration.id}, 1)`)
        }

        yield* DatabaseMigration.apply(db)

        expect(
          yield* db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session_context_epoch'`),
        ).toBeUndefined()
      }),
    )
  })

  test("accepts a compatible session_context_epoch table with a reliable journal", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* db.run(sql`CREATE TABLE session (id text PRIMARY KEY)`)
        yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
        for (const migration of migrations) {
          yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES (${migration.id}, 1)`)
        }
        yield* db.run(sql`${sql.raw(createSessionContextEpochTable)}`)

        yield* DatabaseMigration.apply(db)

        expect(
          yield* db.get(
            sql`SELECT name FROM pragma_table_info('session_context_epoch') WHERE name = 'baseline'`,
          ),
        ).toEqual({ name: "baseline" })
      }),
    )
  })

  test("rejects a session_context_epoch table with the wrong column type", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE session_context_epoch (
            session_id text PRIMARY KEY,
            baseline text NOT NULL,
            snapshot text NOT NULL,
            baseline_seq text NOT NULL
          )`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch column baseline_seq has type text, expected integer")
  })

  test("rejects a session_context_epoch table with a nullable required column", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE session_context_epoch (
            session_id text PRIMARY KEY,
            baseline text,
            snapshot text NOT NULL,
            baseline_seq integer NOT NULL
          )`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch column baseline must be NOT NULL")
  })

  test("rejects a session_context_epoch table with a missing primary key", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE session_context_epoch (
            session_id text NOT NULL,
            baseline text NOT NULL,
            snapshot text NOT NULL,
            baseline_seq integer NOT NULL
          )`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch column session_id must be the PRIMARY KEY")
  })

  test("rejects a session_context_epoch table missing a required column", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE session_context_epoch (
            session_id text PRIMARY KEY,
            baseline text NOT NULL,
            snapshot text NOT NULL
          )`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch is missing required column: baseline_seq")
  })

  test("rejects session_context_epoch without a reliable migration journal", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`${sql.raw(createSessionContextEpochTable)}`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch exists but has no reliable migration journal")
  })

  test("rejects session_context_epoch when journal has a later marker but not the creation marker", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          const creationIndex = migrations.findIndex(
            (migration) => migration.id === "20260605003541_add_session_context_snapshot",
          )
          const laterMarker = migrations[creationIndex + 1].id
          yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
          yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES (${laterMarker}, 1)`)
          yield* db.run(sql`${sql.raw(createSessionContextEpochTable)}`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch exists but its creation migration is missing from the journal")
  })

  test("rejects a future migration marker in the session_context_epoch journal", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
          yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES ('20990101000000_future_marker', 1)`)
          yield* db.run(sql`${sql.raw(createSessionContextEpochTable)}`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch migration journal contains a future migration marker")
  })

  test("rejects a future migration marker in the drizzle journal", async () => {
    await expect(
      run(
        Effect.gen(function* () {
          const db = yield* makeDb
          yield* db.run(
            sql`CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric, name text, applied_at TEXT)`,
          )
          yield* db.run(sql`
            INSERT INTO __drizzle_migrations (hash, created_at, name, applied_at)
            VALUES ('hash', 1, '20990101000000_future_marker', '2026-01-01T00:00:00Z')
          `)
          yield* db.run(sql`${sql.raw(createSessionContextEpochTable)}`)
          yield* DatabaseMigration.apply(db)
        }),
      ),
    ).rejects.toThrow("session_context_epoch migration journal contains a future migration marker")
  })

  test("extra columns on session_context_epoch are allowed when the required contract matches", async () => {
    await run(
      Effect.gen(function* () {
        const db = yield* makeDb
        yield* db.run(sql`CREATE TABLE session (id text PRIMARY KEY)`)
        yield* db.run(sql`CREATE TABLE migration (id TEXT PRIMARY KEY, time_completed INTEGER NOT NULL)`)
        for (const migration of migrations) {
          yield* db.run(sql`INSERT INTO migration (id, time_completed) VALUES (${migration.id}, 1)`)
        }
        yield* db.run(sql`CREATE TABLE session_context_epoch (
          session_id text PRIMARY KEY,
          baseline text NOT NULL,
          snapshot text NOT NULL,
          baseline_seq integer NOT NULL,
          extra_column text
        )`)

        yield* DatabaseMigration.apply(db)

        expect(
          yield* db.get(sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'session'`),
        ).toEqual({ name: "session" })
      }),
    )
  })
})
