import { PanelV2, PanelHeaderV2 } from "./panel-v2"

const docs = `### PanelV2
Card/panel surface with density modes and optional raised shadow.`

export default {
  title: "UI V2 Enterprise/Panel",
  id: "components-panel-v2",
  component: PanelV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <PanelV2 style={{ width: "320px" }}>
      <PanelHeaderV2>Panel title</PanelHeaderV2>
      <div>Panel content</div>
    </PanelV2>
  ),
}

export const Densities = {
  render: () => (
    <div style={{ display: "flex", gap: "12px" }}>
      {["compact", "default", "comfortable"].map((density) => (
        <PanelV2 density={density as any} raised style={{ width: "200px" }}>
          <PanelHeaderV2>{density}</PanelHeaderV2>
          <div>Content</div>
        </PanelV2>
      ))}
    </div>
  ),
}
