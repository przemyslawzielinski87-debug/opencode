import { SurfaceCardV2 } from "./surface-card-v2"

const docs = `### SurfaceCardV2
Elevated surface card with density-aware padding.`

export default {
  title: "UI V2 Enterprise/SurfaceCard",
  id: "components-surface-card-v2",
  component: SurfaceCardV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => <SurfaceCardV2 style={{ width: "240px" }}>Card content</SurfaceCardV2>,
}

export const Densities = {
  render: () => (
    <div style={{ display: "flex", gap: "12px" }}>
      {["compact", "default", "comfortable"].map((density) => (
        <SurfaceCardV2 density={density as any} style={{ width: "160px" }}>
          {density}
        </SurfaceCardV2>
      ))}
    </div>
  ),
}
