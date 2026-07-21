import { describe, expect, test } from "bun:test"
import {
  hasNonBlockingServiceIssue,
  lspStatusTextKey,
  mcpStatusTextKey,
  overallStatusKey,
  serverStatusDotClass,
} from "./status-popover-indicator"

describe("serverStatusDotClass", () => {
  test("success when ready, server healthy, and no issue", () => {
    expect(serverStatusDotClass({ ready: true, serverHealth: true, issue: false })).toBe("bg-icon-success-base")
  })

  test("warning when ready, server healthy, and a non-blocking issue exists", () => {
    expect(serverStatusDotClass({ ready: true, serverHealth: true, issue: true })).toBe("bg-icon-warning-base")
  })

  test("critical when server connection drops regardless of issue", () => {
    expect(serverStatusDotClass({ ready: true, serverHealth: false, issue: false })).toBe("bg-icon-critical-base")
    expect(serverStatusDotClass({ ready: true, serverHealth: false, issue: true })).toBe("bg-icon-critical-base")
  })

  test("neutral before status is ready", () => {
    expect(serverStatusDotClass({ ready: false, serverHealth: true, issue: false })).toBe("bg-border-weak-base")
    expect(serverStatusDotClass({ ready: false, serverHealth: undefined, issue: false })).toBe("bg-border-weak-base")
  })

  test("neutral when server health is unknown but ready", () => {
    expect(serverStatusDotClass({ ready: true, serverHealth: undefined, issue: false })).toBe("bg-border-weak-base")
  })
})

describe("hasNonBlockingServiceIssue", () => {
  test("detects MCP failures that do not block chatting", () => {
    expect(hasNonBlockingServiceIssue({ mcp: ["failed"], lsp: [] })).toBe(true)
    expect(hasNonBlockingServiceIssue({ mcp: ["needs_auth"], lsp: [] })).toBe(true)
    expect(hasNonBlockingServiceIssue({ mcp: ["needs_client_registration"], lsp: [] })).toBe(true)
    expect(hasNonBlockingServiceIssue({ mcp: ["connected", "disabled"], lsp: [] })).toBe(false)
  })

  test("detects LSP failures that do not block chatting", () => {
    expect(hasNonBlockingServiceIssue({ mcp: [], lsp: ["error"] })).toBe(true)
    expect(hasNonBlockingServiceIssue({ mcp: [], lsp: ["connected"] })).toBe(false)
  })
})

describe("overallStatusKey", () => {
  test("failed when server is offline", () => {
    expect(overallStatusKey({ serverHealth: false, loading: false, issue: false })).toBe(
      "status.popover.overview.status.failed",
    )
  })

  test("connecting while loading or unknown", () => {
    expect(overallStatusKey({ serverHealth: undefined, loading: true, issue: false })).toBe(
      "status.popover.overview.status.connecting",
    )
    expect(overallStatusKey({ serverHealth: undefined, loading: false, issue: false })).toBe(
      "status.popover.overview.status.connecting",
    )
  })

  test("degraded when server is online but an issue exists", () => {
    expect(overallStatusKey({ serverHealth: true, loading: false, issue: true })).toBe(
      "status.popover.overview.status.degraded",
    )
  })

  test("healthy when server is online with no issue", () => {
    expect(overallStatusKey({ serverHealth: true, loading: false, issue: false })).toBe(
      "status.popover.overview.status.healthy",
    )
  })
})

describe("mcpStatusTextKey", () => {
  test("maps every MCP status to an i18n key", () => {
    expect(mcpStatusTextKey("connected")).toBe("status.popover.status.connected")
    expect(mcpStatusTextKey("disabled")).toBe("status.popover.status.disabled")
    expect(mcpStatusTextKey("failed")).toBe("status.popover.status.failed")
    expect(mcpStatusTextKey("needs_auth")).toBe("status.popover.status.needsAuth")
    expect(mcpStatusTextKey("needs_client_registration")).toBe("status.popover.status.needsRegistration")
  })
})

describe("lspStatusTextKey", () => {
  test("maps every LSP status to an i18n key", () => {
    expect(lspStatusTextKey("connected")).toBe("status.popover.status.connected")
    expect(lspStatusTextKey("error")).toBe("status.popover.status.failed")
  })
})
