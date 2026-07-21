import { ResponsiveStackV2 } from "./responsive-stack-v2"

const docs = `### ResponsiveStackV2
Directional stack that collapses to column on narrow viewports.`

export default {
  title: "UI V2 Enterprise/ResponsiveStack",
  id: "components-responsive-stack-v2",
  component: ResponsiveStackV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Row = {
  render: () => (
    <ResponsiveStackV2 direction="row" gap="3" justify="between" style={{ width: "320px", padding: "8px", background: "var(--v2-background-bg-layer-01)" }}>
      <span>Left</span>
      <span>Middle</span>
      <span>Right</span>
    </ResponsiveStackV2>
  ),
}

export const Column = {
  render: () => (
    <ResponsiveStackV2 direction="column" gap="2">
      <span>One</span>
      <span>Two</span>
      <span>Three</span>
    </ResponsiveStackV2>
  ),
}
