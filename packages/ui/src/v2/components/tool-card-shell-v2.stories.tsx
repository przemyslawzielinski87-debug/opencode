import { ToolCardShellV2 } from "./tool-card-shell-v2"
import { IconButtonWithLabelV2 } from "./icon-button-with-label-v2"

const docs = `### ToolCardShellV2
Expandable tool card shell with accent color, status, and action slots.`

export default {
  title: "UI V2 Enterprise/ToolCardShell",
  id: "components-tool-card-shell-v2",
  component: ToolCardShellV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Terminal = {
  render: () => (
    <ToolCardShellV2
      accent="terminal"
      icon="terminal"
      title="npm run build"
      status="running"
      statusLabel="Running"
      duration="12s"
      defaultExpanded
      actions={<IconButtonWithLabelV2 icon="rotate-ccw" label="Retry" />}
      style={{ width: "360px" }}
    >
      <div>Build output goes here...</div>
    </ToolCardShellV2>
  ),
}

export const Git = {
  render: () => (
    <ToolCardShellV2
      accent="git"
      icon="git-branch"
      title="feat: status surface"
      status="queued"
      statusLabel="Queued"
      style={{ width: "360px" }}
    >
      <div>Changed files: 4</div>
    </ToolCardShellV2>
  ),
}
