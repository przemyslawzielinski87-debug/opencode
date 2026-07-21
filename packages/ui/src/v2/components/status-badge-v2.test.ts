import { test, expect } from "bun:test"
import { normalizeStatus } from "./status-badge-v2"

test("normalizeStatus collapses aliases", () => {
  expect(normalizeStatus("success")).toBe("healthy")
  expect(normalizeStatus("warning")).toBe("degraded")
  expect(normalizeStatus("error")).toBe("failed")
  expect(normalizeStatus("critical")).toBe("failed")
  expect(normalizeStatus("active")).toBe("running")
  expect(normalizeStatus("pending")).toBe("queued")
  expect(normalizeStatus("disabled")).toBe("muted")
  expect(normalizeStatus("neutral")).toBe("muted")
  expect(normalizeStatus("info")).toBe("running")
  expect(normalizeStatus("unknown")).toBe("unknown")
  expect(normalizeStatus("healthy")).toBe("healthy")
})
