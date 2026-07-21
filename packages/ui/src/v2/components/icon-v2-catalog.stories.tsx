import { Icon } from "./icon"

const docs = `### Enterprise Semantic Icon Catalog
All approved semantic icons available in the V2 sprite.`

export default {
  title: "UI V2 Enterprise/IconCatalog",
  id: "components-icon-v2-catalog",
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

const icons = [
  "check-circle",
  "dot",
  "alert-triangle",
  "x-octagon",
  "loader",
  "clock",
  "minus-circle",
  "help-circle",
  "server",
  "puzzle",
  "plugin",
  "code-2",
  "bot",
  "brain",
  "shield-check",
  "clipboard-check",
  "activity",
  "shield",
  "play-circle",
  "cpu",
  "terminal",
  "git-branch",
  "git-compare",
  "file-code",
  "check-square",
  "folder-open",
  "search",
  "bell",
  "settings-gear",
  "home",
  "folder",
  "message-square",
  "send",
  "map",
  "layers",
  "rotate-ccw",
  "refresh-cw",
  "check",
  "x",
  "chevron-down",
  "chevron-right",
  "pin",
  "more-horizontal",
  "more-vertical",
  "filter",
  "arrow-up-down",
  "rocket",
  "database",
  "globe",
  "user-plus",
  "key",
  "lock",
]

export const Catalog = {
  render: () => (
    <div style={{ display: "grid", "grid-template-columns": "repeat(6, 1fr)", gap: "12px", padding: "16px" }}>
      {icons.map((name) => (
        <div style={{ display: "flex", "flex-direction": "column", "align-items": "center", gap: "4px" }}>
          <Icon name={name as any} size="large" aria-hidden="true" />
          <span style={{ "font-size": "10px", color: "var(--v2-text-text-muted)" }}>{name}</span>
        </div>
      ))}
    </div>
  ),
}
