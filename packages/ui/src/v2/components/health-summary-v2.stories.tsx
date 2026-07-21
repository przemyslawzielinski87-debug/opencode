import { HealthSummaryV2 } from "./health-summary-v2"

const docs = `### HealthSummaryV2
Summary list of status dots with labels and counts.`

export default {
  title: "UI V2 Enterprise/HealthSummary",
  id: "components-health-summary-v2",
  component: HealthSummaryV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <HealthSummaryV2
      ariaLabel="Service health"
      items={[
        { label: "Serwery", status: "healthy", count: 3 },
        { label: "MCP", status: "degraded", count: 1 },
        { label: "LSP", status: "failed", count: 0 },
        { label: "Wtyczki", status: "muted", count: 2 },
      ]}
      style={{ width: "240px" }}
    />
  ),
}
