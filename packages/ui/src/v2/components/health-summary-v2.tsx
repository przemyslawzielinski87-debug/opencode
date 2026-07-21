import { type ComponentProps, For, splitProps } from "solid-js"
import { StatusDotV2, type StatusDotStatus } from "./status-dot-v2"
import "./health-summary-v2.css"

export interface HealthSummaryItem {
  label: string
  status: StatusDotStatus
  count?: number
}

export interface HealthSummaryV2Props extends ComponentProps<"div"> {
  items: HealthSummaryItem[]
  ariaLabel?: string
}

export function HealthSummaryV2(props: HealthSummaryV2Props) {
  const [split, rest] = splitProps(props, ["items", "ariaLabel", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="health-summary-v2"
      role="list"
      aria-label={split.ariaLabel}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <For each={split.items}>
        {(item) => (
          <div data-slot="item" role="listitem">
            <StatusDotV2 status={item.status} size="normal" />
            <span data-slot="label">{item.label}</span>
            <span data-slot="count">{item.count ?? 0}</span>
          </div>
        )}
      </For>
    </div>
  )
}
