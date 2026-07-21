import { DataRowV2 } from "./data-row-v2"
import { Icon } from "./icon"

const docs = `### DataRowV2
List row with leading icon, title, description, status badge and trailing slot.`

export default {
  title: "UI V2 Enterprise/DataRow",
  id: "components-data-row-v2",
  component: DataRowV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <DataRowV2
      leading={<Icon name="server" />}
      title="Production server"
      description="v1.17.9"
      status="healthy"
      statusLabel="Healthy"
      style={{ width: "320px" }}
    />
  ),
}

export const Densities = {
  render: () => (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      {["compact", "default", "comfortable"].map((density) => (
        <DataRowV2
          density={density as any}
          leading={<Icon name="puzzle" />}
          title="Filesystem MCP"
          status="running"
          statusLabel="Running"
          style={{ width: "320px" }}
        />
      ))}
    </div>
  ),
}
