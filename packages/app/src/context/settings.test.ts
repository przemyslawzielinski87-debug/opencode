import { describe, expect, test } from "bun:test"
import { migrateStatusSurface } from "./settings"

describe("migrateStatusSurface", () => {
  test("fresh install shape keeps defaults intact", () => {
    expect(migrateStatusSurface(null)).toBeNull()
  })

  test("migrates legacy settings to show status once", () => {
    const result = migrateStatusSurface({ general: { showStatus: false } }) as {
      statusSurfaceMigrationVersion: number
      general: { showStatus: boolean }
    }
    expect(result.statusSurfaceMigrationVersion).toBe(1)
    expect(result.general.showStatus).toBe(true)
  })

  test("does not repeat migration when version marker is present", () => {
    const result = migrateStatusSurface({
      statusSurfaceMigrationVersion: 1,
      general: { showStatus: false },
    }) as {
      statusSurfaceMigrationVersion: number
      general: { showStatus: boolean }
    }
    expect(result.statusSurfaceMigrationVersion).toBe(1)
    expect(result.general.showStatus).toBe(false)
  })

  test("preserves unrelated settings during migration", () => {
    const result = migrateStatusSurface({
      general: { showStatus: false, showSearch: true, autoSave: false },
      appearance: { fontSize: 18 },
    }) as {
      general: { showStatus: boolean; showSearch: boolean; autoSave: boolean }
      appearance: { fontSize: number }
    }
    expect(result.general.showStatus).toBe(true)
    expect(result.general.showSearch).toBe(true)
    expect(result.general.autoSave).toBe(false)
    expect(result.appearance.fontSize).toBe(18)
  })
})
