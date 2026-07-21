import { RetryStateV2 } from "./retry-state-v2"

const docs = `### RetryStateV2
Convenience wrapper that renders ErrorStateV2 or UnavailableStateV2 based on status.`

export default {
  title: "UI V2 Enterprise/RetryState",
  id: "components-retry-state-v2",
  component: RetryStateV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Error = {
  render: () => <RetryStateV2 status="error" title="Could not load" onRetry={() => {}} />,
}

export const Unavailable = {
  render: () => <RetryStateV2 status="unavailable" title="Service unavailable" onRetry={() => {}} />,
}
