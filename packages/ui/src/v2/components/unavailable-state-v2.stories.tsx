import { UnavailableStateV2 } from "./unavailable-state-v2"

const docs = `### UnavailableStateV2
Muted unavailable state for disabled or offline resources.`

export default {
  title: "UI V2 Enterprise/UnavailableState",
  id: "components-unavailable-state-v2",
  component: UnavailableStateV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Basic = {
  render: () => <UnavailableStateV2 title="Usługa niedostępna" description="MCP jest wyłączony dla tego projektu." />,
}

export const WithRetry = {
  render: () => <UnavailableStateV2 title="Offline" onRetry={() => {}} retryLabel="Retry" />,
}
