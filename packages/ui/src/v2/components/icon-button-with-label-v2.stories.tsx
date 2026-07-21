import { IconButtonWithLabelV2 } from "./icon-button-with-label-v2"

const docs = `### IconButtonWithLabelV2
Icon button with visible label for toolbars and actions.`

export default {
  title: "UI V2 Enterprise/IconButtonWithLabel",
  id: "components-icon-button-with-label-v2",
  component: IconButtonWithLabelV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <IconButtonWithLabelV2 icon="refresh-cw" label="Retry" />
      <IconButtonWithLabelV2 icon="settings" label="Manage" />
      <IconButtonWithLabelV2 icon="rotate-ccw" label="Rollback" />
    </div>
  ),
}
