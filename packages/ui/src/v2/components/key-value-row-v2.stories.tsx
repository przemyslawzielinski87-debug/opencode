import { KeyValueRowV2 } from "./key-value-row-v2"

const docs = `### KeyValueRowV2
Two-column key/value row with optional description.`

export default {
  title: "UI V2 Enterprise/KeyValueRow",
  id: "components-key-value-row-v2",
  component: KeyValueRowV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Basic = {
  render: () => (
    <div style={{ width: "320px" }}>
      <KeyValueRowV2 label="Provider" value="OpenAI" />
      <KeyValueRowV2 label="Model" value="gpt-4o" description="Default for new sessions" />
    </div>
  ),
}
