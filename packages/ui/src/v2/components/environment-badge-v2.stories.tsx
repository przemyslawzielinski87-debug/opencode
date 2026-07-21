import { EnvironmentBadgeV2 } from "./environment-badge-v2"

const docs = `### EnvironmentBadgeV2
Scope/environment badge for project/server context.`

export default {
  title: "UI V2 Enterprise/EnvironmentBadge",
  id: "components-environment-badge-v2",
  component: EnvironmentBadgeV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => (
    <div style={{ display: "flex", gap: "8px" }}>
      <EnvironmentBadgeV2 environment="Production" />
      <EnvironmentBadgeV2 environment="staging-themeridian" />
      <EnvironmentBadgeV2 />
    </div>
  ),
}
