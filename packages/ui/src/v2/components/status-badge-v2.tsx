import { type ComponentProps, Match, splitProps, Switch } from "solid-js"
import { Icon, type IconProps } from "./icon"
import "./status-badge-v2.css"

export type StatusBadgeStatus =
  | "healthy"
  | "success"
  | "degraded"
  | "warning"
  | "failed"
  | "error"
  | "critical"
  | "running"
  | "active"
  | "queued"
  | "pending"
  | "muted"
  | "disabled"
  | "unknown"
  | "info"
  | "neutral"

export interface StatusBadgeV2Props extends ComponentProps<"span"> {
  status: StatusBadgeStatus
  label?: string
  size?: "small" | "normal"
  variant?: "subtle" | "strong" | "outline"
  density?: "compact" | "default" | "comfortable"
  showIcon?: boolean
}

export function normalizeStatus(status: StatusBadgeStatus) {
  switch (status) {
    case "success":
      return "healthy"
    case "warning":
      return "degraded"
    case "error":
    case "critical":
      return "failed"
    case "active":
      return "running"
    case "pending":
      return "queued"
    case "disabled":
    case "neutral":
      return "muted"
    case "info":
      return "running"
    default:
      return status
  }
}

function statusIcon(status: ReturnType<typeof normalizeStatus>): IconProps["name"] {
  switch (status) {
    case "healthy":
      return "check-circle"
    case "degraded":
      return "alert-triangle"
    case "failed":
      return "x-octagon"
    case "running":
      return "loader"
    case "queued":
      return "clock"
    case "muted":
      return "minus-circle"
    default:
      return "help-circle"
  }
}

export function StatusBadgeV2(props: StatusBadgeV2Props) {
  const [split, rest] = splitProps(props, [
    "status",
    "label",
    "size",
    "variant",
    "density",
    "showIcon",
    "class",
    "classList",
  ])
  const normalized = () => normalizeStatus(split.status)
  const icon = () => statusIcon(normalized())
  const label = () => split.label ?? ""

  return (
    <span
      {...rest}
      data-component="status-badge-v2"
      data-status={normalized()}
      data-size={split.size ?? "normal"}
      data-variant={split.variant ?? "subtle"}
      data-density={split.density ?? "default"}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      aria-label={rest["aria-label"] ?? label()}
      role="status"
    >
      <Switch>
        <Match when={split.showIcon !== false}>
          <Icon name={icon()} size={split.size === "small" ? "small" : "normal"} aria-hidden="true" />
        </Match>
      </Switch>
      <Switch>
        <Match when={label()}>{label()}</Match>
      </Switch>
    </span>
  )
}
