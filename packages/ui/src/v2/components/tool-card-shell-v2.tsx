import { type ComponentProps, type JSX, Show, splitProps, createSignal } from "solid-js"
import { Icon, type IconProps } from "./icon"
import { StatusBadgeV2, type StatusBadgeStatus } from "./status-badge-v2"
import "./tool-card-shell-v2.css"

export interface ToolCardShellV2Props extends ComponentProps<"div"> {
  icon?: IconProps["name"]
  title: string
  status?: StatusBadgeStatus
  statusLabel?: string
  duration?: string
  accent?: string
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (value: boolean) => void
  actions?: JSX.Element
}

export function ToolCardShellV2(props: ToolCardShellV2Props) {
  const [split, rest] = splitProps(props, [
    "icon",
    "title",
    "status",
    "statusLabel",
    "duration",
    "accent",
    "expanded",
    "defaultExpanded",
    "onExpandedChange",
    "actions",
    "class",
    "classList",
    "children",
  ])
  const [localExpanded, setLocalExpanded] = createSignal(split.defaultExpanded ?? false)
  const isExpanded = () => (split.expanded !== undefined ? split.expanded : localExpanded())
  const toggle = () => {
    const next = !isExpanded()
    if (split.expanded === undefined) setLocalExpanded(next)
    split.onExpandedChange?.(next)
  }

  return (
    <div
      {...rest}
      data-component="tool-card-shell-v2"
      data-expanded={isExpanded() ? "" : undefined}
      data-accent={split.accent}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <div data-slot="accent" aria-hidden="true" />
      <button
        data-slot="header"
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded()}
      >
        <Show when={split.icon}>
          <Icon name={split.icon!} size="normal" aria-hidden="true" />
        </Show>
        <span data-slot="title">{split.title}</span>
        <Show when={split.duration}>
          <span data-slot="duration">{split.duration}</span>
        </Show>
        <Show when={split.status}>
          <StatusBadgeV2 status={split.status!} label={split.statusLabel} size="small" />
        </Show>
        <span data-slot="chevron" aria-hidden="true">
          <Icon name="chevron-down" size="small" />
        </span>
      </button>
      <Show when={isExpanded()}>
        <div data-slot="body">{split.children}</div>
      </Show>
      <Show when={split.actions}>
        <div data-slot="actions">{split.actions}</div>
      </Show>
    </div>
  )
}
