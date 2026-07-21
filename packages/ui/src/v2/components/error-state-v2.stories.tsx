import { ErrorStateV2 } from "./error-state-v2"

const docs = `### ErrorStateV2
Accessible error surface with optional retry action.`

export default {
  title: "UI V2 Enterprise/ErrorState",
  id: "components-error-state-v2",
  component: ErrorStateV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Basic = {
  render: () => <ErrorStateV2 title="Nie udało się załadować" description="Sprawdź połączenie i spróbuj ponownie." />,
}

export const WithRetry = {
  render: () => <ErrorStateV2 title="Błąd ładowania" onRetry={() => {}} retryLabel="Spróbuj ponownie" />,
}
