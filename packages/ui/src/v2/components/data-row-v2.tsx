import { type ComponentProps, type JSX, Show, splitProps } from "solid-js"
import { StatusBadgeV2, type StatusBadgeStatus } from "./status-badge-v2"
import "./data-row-v2.css"

export interface DataRowV2Props extends ComponentProps<"div"> {
  leading?: JSX.Element
  title: string
  description?: string
  trailing?: JSX.Element
  status?: StatusBadgeStatus
  statusLabel?: string
  density?: "compact" | "default" | "comfortable"
}

export function DataRowV2(props: DataRowV2Props) {
  const [split, rest] = splitProps(props, [
    "leading",
    "title",
    "description",
    "trailing",
    "status",
    "statusLabel",
    "density",
    "class",
    "classList",
  ])

  return (
    <div
      {...rest}
      data-component="data-row-v2"
      data-density={split.density ?? "default"}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <div data-slot="leading">{split.leading}</div>
      <div data-slot="content">
        <div data-slot="title">{split.title}</div>
        <Show when={split.description}>
          <div data-slot="description">{split.description}</div>
        </Show>
      </div>
      <Show when={split.status}>
        <StatusBadgeV2 status={split.status!} label={split.statusLabel} />
      </Show>
      <div data-slot="trailing">{split.trailing}</div>
    </div>
  )
}
