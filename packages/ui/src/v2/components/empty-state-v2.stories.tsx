import { EmptyStateV2 } from "./empty-state-v2"

const docs = `### EmptyStateV2
Centered empty state with icon, title, optional description and action slot.`

export default {
  title: "UI V2 Enterprise/EmptyState",
  id: "components-empty-state-v2",
  component: EmptyStateV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Basic = {
  render: () => <EmptyStateV2 icon="folder-open" title="Brak projektów" description="Dodaj pierwszy projekt, aby rozpocząć." />,
}

export const WithAction = {
  render: () => (
    <EmptyStateV2
      icon="server"
      title="No servers configured"
      description="Connect a server to see status details."
      action={<button type="button">Add server</button>}
    />
  ),
}
