import { SectionHeaderV2 } from "./section-header-v2"
import { IconButtonWithLabelV2 } from "./icon-button-with-label-v2"

const docs = `### SectionHeaderV2
Section title with optional subtitle and action slot.`

export default {
  title: "UI V2 Enterprise/SectionHeader",
  id: "components-section-header-v2",
  component: SectionHeaderV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Basic = {
  render: () => <SectionHeaderV2 title="Serwery" subtitle="Stan połączeń serwera OpenCode" />,
}

export const WithActions = {
  render: () => (
    <SectionHeaderV2
      title="MCP servers"
      subtitle="3 connected"
      actions={<IconButtonWithLabelV2 icon="settings" label="Manage" />}
    />
  ),
}
