import { type ComponentProps, Show, splitProps } from "solid-js"
import { Icon } from "./icon"
import "./unavailable-state-v2.css"

export interface UnavailableStateV2Props extends ComponentProps<"div"> {
  title: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
}

export function UnavailableStateV2(props: UnavailableStateV2Props) {
  const [split, rest] = splitProps(props, [
    "title",
    "description",
    "retryLabel",
    "onRetry",
    "class",
    "classList",
  ])

  return (
    <div
      {...rest}
      data-component="unavailable-state-v2"
      role="status"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <Icon name="minus-circle" size="large" aria-hidden="true" />
      <h3 data-slot="title">{split.title}</h3>
      <Show when={split.description}>
        <p data-slot="description">{split.description}</p>
      </Show>
      <Show when={split.onRetry}>
        <button data-slot="retry" type="button" onClick={split.onRetry}>
          <Icon name="refresh-cw" size="small" aria-hidden="true" />
          {split.retryLabel ?? "Retry"}
        </button>
      </Show>
    </div>
  )
}
