import { StatusBadgeV2 } from "./status-badge-v2"

const docs = `### StatusBadgeV2
Semantic status badge with icon + label. Supports subtle/strong/outline variants, compact/default/comfortable density, and light/dark themes.`

export default {
  title: "UI V2 Enterprise/StatusBadge",
  id: "components-status-badge-v2",
  component: StatusBadgeV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const AllStatuses = {
  render: () => (
    <div style={{ display: "flex", "flex-direction": "column", gap: "12px", padding: "16px" }}>
      {[
        "healthy",
        "degraded",
        "failed",
        "running",
        "queued",
        "muted",
        "unknown",
      ].map((status) => (
        <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          <StatusBadgeV2 status={status as any} label={status} />
          <StatusBadgeV2 status={status as any} label={status} variant="strong" />
          <StatusBadgeV2 status={status as any} label={status} variant="outline" />
        </div>
      ))}
    </div>
  ),
}

export const Densities = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
      <StatusBadgeV2 status="healthy" label="Compact" density="compact" />
      <StatusBadgeV2 status="healthy" label="Default" density="default" />
      <StatusBadgeV2 status="healthy" label="Comfortable" density="comfortable" />
    </div>
  ),
}

export const LongPolishLabel = {
  render: () => <StatusBadgeV2 status="degraded" label="Wymaga uwierzytelnienia w dostawcy" />,
}
