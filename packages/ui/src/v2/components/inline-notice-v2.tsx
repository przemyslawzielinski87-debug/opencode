import { type ComponentProps, Show, splitProps } from "solid-js"
import { Icon } from "./icon"
import { StatusBadgeV2, type StatusBadgeStatus } from "./status-badge-v2"
import "./inline-notice-v2.css"

export interface InlineNoticeV2Props extends ComponentProps<"div"> {
  status: StatusBadgeStatus
  title?: string
  description?: string
}

export function InlineNoticeV2(props: InlineNoticeV2Props) {
  const [split, rest] = splitProps(props, ["status", "title", "description", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="inline-notice-v2"
      data-status={split.status}
      role="status"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <Icon name="alert-triangle" size="small" aria-hidden="true" />
      <div data-slot="content">
        <Show when={split.title}>
          <span data-slot="title">
            <StatusBadgeV2 status={split.status} label={split.title} size="small" />
          </span>
        </Show>
        <Show when={split.description}>
          <span data-slot="description">{split.description}</span>
        </Show>
      </div>
    </div>
  )
}
