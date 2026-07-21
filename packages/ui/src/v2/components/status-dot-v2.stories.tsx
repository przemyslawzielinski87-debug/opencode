import { StatusDotV2 } from "./status-dot-v2"

const docs = `### StatusDotV2
Small status dot with semantic color. Supports pulse animation when motion is allowed.`

export default {
  title: "UI V2 Enterprise/StatusDot",
  id: "components-status-dot-v2",
  component: StatusDotV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const AllStatuses = {
  render: () => (
    <div style={{ display: "flex", gap: "16px", "align-items": "center", padding: "16px" }}>
      {["healthy", "degraded", "failed", "running", "queued", "muted", "unknown"].map((status) => (
        <StatusDotV2 status={status as any} />
      ))}
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", "align-items": "center" }}>
      <StatusDotV2 status="healthy" size="small" />
      <StatusDotV2 status="healthy" size="normal" />
      <StatusDotV2 status="healthy" size="large" />
      <StatusDotV2 status="healthy" size="emphasized" pulse />
    </div>
  ),
}

export const Pulsing = {
  render: () => (
    <div style={{ display: "flex", gap: "12px", padding: "16px" }}>
      <StatusDotV2 status="running" pulse />
      <StatusDotV2 status="queued" pulse />
    </div>
  ),
}
