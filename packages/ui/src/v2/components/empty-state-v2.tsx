import { type ComponentProps, type JSX, Show, splitProps } from "solid-js"
import { Icon, type IconProps } from "./icon"
import "./empty-state-v2.css"

export interface EmptyStateV2Props extends ComponentProps<"div"> {
  icon?: IconProps["name"]
  title: string
  description?: string
  action?: JSX.Element
}

export function EmptyStateV2(props: EmptyStateV2Props) {
  const [split, rest] = splitProps(props, ["icon", "title", "description", "action", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="empty-state-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      role="status"
    >
      <Show when={split.icon}>
        <div data-slot="icon">
          <Icon name={split.icon!} size="large" aria-hidden="true" />
        </div>
      </Show>
      <h3 data-slot="title">{split.title}</h3>
      <Show when={split.description}>
        <p data-slot="description">{split.description}</p>
      </Show>
      <Show when={split.action}>
        <div data-slot="action">{split.action}</div>
      </Show>
    </div>
  )
}
