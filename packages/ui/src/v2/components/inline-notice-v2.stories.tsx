import { InlineNoticeV2 } from "./inline-notice-v2"

const docs = `### InlineNoticeV2
Compact inline notice with status color and title/description.`

export default {
  title: "UI V2 Enterprise/InlineNotice",
  id: "components-inline-notice-v2",
  component: InlineNoticeV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const AllStatuses = {
  render: () => (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px", width: "320px" }}>
      <InlineNoticeV2 status="degraded" title="Uwaga" description="Jeden z serwerów MCP jest wyłączony." />
      <InlineNoticeV2 status="failed" title="Błąd" description="Nie udało się połączyć z serwerem." />
      <InlineNoticeV2 status="muted" title="Info" description="LSP wykrywane automatycznie." />
    </div>
  ),
}
