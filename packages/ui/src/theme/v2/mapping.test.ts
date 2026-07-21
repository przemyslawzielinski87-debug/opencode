import { test, expect } from "bun:test"
import { mapV2Semantics } from "./mapping"

const statuses = ["healthy", "degraded", "failed", "running", "queued", "muted"]

function isColorReference(value: unknown) {
  return typeof value === "string" && (value.startsWith("var(--") || value.startsWith("#"))
}

test("status tokens exist for light and dark themes", () => {
  const light = mapV2Semantics(false)
  const dark = mapV2Semantics(true)

  for (const status of statuses) {
    for (const suffix of ["fg", "bg", "border"]) {
      const key = `v2-status-${suffix}-${status}`
      expect(light[key]).toBeDefined()
      expect(dark[key]).toBeDefined()
      expect(isColorReference(light[key])).toBe(true)
      expect(isColorReference(dark[key])).toBe(true)
    }
  }
})

test("status compatibility aliases exist", () => {
  const light = mapV2Semantics(false)
  expect(light["v2-status-success"]).toBe(light["v2-status-healthy"])
  expect(light["v2-status-warning"]).toBe(light["v2-status-degraded"])
  expect(light["v2-status-danger"]).toBe(light["v2-status-failed"])
  expect(light["v2-status-info"]).toBe(light["v2-status-running"])
  expect(light["v2-status-neutral"]).toBe(light["v2-status-muted"])
})

test("tool accent tokens exist", () => {
  const light = mapV2Semantics(false)
  const accents = [
    "terminal",
    "git",
    "github",
    "mcp",
    "test",
    "build",
    "deploy",
    "database",
    "systemd",
    "browser",
    "file-edit",
    "diff",
    "plan",
    "approval",
  ]
  for (const accent of accents) {
    expect(light[`v2-tool-${accent}`]).toBeDefined()
  }
})

test("elevation and border tokens remain untouched", () => {
  const light = mapV2Semantics(false)
  expect(light["v2-elevation-raised"]).toBeDefined()
  expect(light["v2-border-border-focus"]).toBeDefined()
})
