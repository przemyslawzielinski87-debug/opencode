import type { LspStatus, McpStatus } from "@opencode-ai/sdk/v2/client"

export function hasNonBlockingServiceIssue(input: {
  mcp: Array<McpStatus["status"]>
  lsp: Array<LspStatus["status"]>
}) {
  return (
    input.mcp.some((status) => status !== "connected" && status !== "disabled") ||
    input.lsp.some((status) => status === "error")
  )
}

export function serverStatusDotClass(input: { ready: boolean; serverHealth: boolean | undefined; issue: boolean }) {
  if (input.serverHealth === false) return "bg-icon-critical-base"
  if (!input.ready || input.serverHealth === undefined) return "bg-border-weak-base"
  if (input.issue) return "bg-icon-warning-base"
  if (input.serverHealth) return "bg-icon-success-base"
  return "bg-border-weak-base"
}

export function mcpStatusTextKey(status: McpStatus["status"]) {
  const map: Record<McpStatus["status"], string> = {
    connected: "status.popover.status.connected",
    disabled: "status.popover.status.disabled",
    failed: "status.popover.status.failed",
    needs_auth: "status.popover.status.needsAuth",
    needs_client_registration: "status.popover.status.needsRegistration",
  }
  return map[status]
}

export function lspStatusTextKey(status: LspStatus["status"]) {
  const map: Record<LspStatus["status"], string> = {
    connected: "status.popover.status.connected",
    error: "status.popover.status.failed",
  }
  return map[status]
}

export function overallStatusKey(input: {
  serverHealth: boolean | undefined
  loading: boolean
  issue: boolean
}) {
  if (input.serverHealth === false) return "status.popover.overview.status.failed"
  if (input.loading || input.serverHealth === undefined) return "status.popover.overview.status.connecting"
  if (input.issue) return "status.popover.overview.status.degraded"
  return "status.popover.overview.status.healthy"
}
