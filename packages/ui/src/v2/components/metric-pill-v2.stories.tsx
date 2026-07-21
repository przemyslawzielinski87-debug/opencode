import { MetricPillV2 } from "./metric-pill-v2"

const docs = `### MetricPillV2
Count/status pill for tabs and summaries.`

export default {
  title: "UI V2 Enterprise/MetricPill",
  id: "components-metric-pill-v2",
  component: MetricPillV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <MetricPillV2 value={3} label="servers" status="healthy" />
      <MetricPillV2 value={1} label="failed" status="failed" />
      <MetricPillV2 value={12} label="pending" status="queued" />
    </div>
  ),
}
