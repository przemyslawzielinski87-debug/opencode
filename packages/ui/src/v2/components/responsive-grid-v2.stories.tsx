import { ResponsiveGridV2 } from "./responsive-grid-v2"

const docs = `### ResponsiveGridV2
Responsive grid that collapses on mobile/tablet.`

export default {
  title: "UI V2 Enterprise/ResponsiveGrid",
  id: "components-responsive-grid-v2",
  component: ResponsiveGridV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <ResponsiveGridV2 columns={3} gap="3" style={{ width: "320px" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div style={{ padding: "16px", background: "var(--v2-background-bg-layer-02)", "border-radius": "8px" }}>{i + 1}</div>
      ))}
    </ResponsiveGridV2>
  ),
}
