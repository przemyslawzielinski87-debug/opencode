import { type ComponentProps, Show, splitProps } from "solid-js"
import { StatusBadgeV2, type StatusBadgeStatus } from "./status-badge-v2"
import "./metric-pill-v2.css"

export interface MetricPillV2Props extends ComponentProps<"span"> {
  value: string | number
  label?: string
  status?: StatusBadgeStatus
}

export function MetricPillV2(props: MetricPillV2Props) {
  const [split, rest] = splitProps(props, ["value", "label", "status", "class", "classList"])

  return (
    <span
      {...rest}
      data-component="metric-pill-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <Show when={split.status}>
        <StatusBadgeV2 status={split.status!} size="small" />
      </Show>
      <span data-slot="value">{split.value}</span>
      <Show when={split.label}>
        <span data-slot="label">{split.label}</span>
      </Show>
    </span>
  )
}
