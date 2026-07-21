import { type ComponentProps, splitProps } from "solid-js"
import "./status-dot-v2.css"

export type StatusDotStatus =
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

export interface StatusDotV2Props extends ComponentProps<"span"> {
  status: StatusDotStatus
  size?: "small" | "normal" | "large" | "emphasized"
  pulse?: boolean
}

function normalizeStatus(status: StatusDotStatus) {
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

export function StatusDotV2(props: StatusDotV2Props) {
  const [split, rest] = splitProps(props, ["status", "size", "pulse", "class", "classList"])

  return (
    <span
      {...rest}
      data-component="status-dot-v2"
      data-status={normalizeStatus(split.status)}
      data-size={split.size ?? "normal"}
      data-pulse={split.pulse ? "" : undefined}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      aria-hidden="true"
    />
  )
}
