import { type ComponentProps, Show, splitProps } from "solid-js"
import "./key-value-row-v2.css"

export interface KeyValueRowV2Props extends ComponentProps<"div"> {
  label: string
  value: string
  description?: string
}

export function KeyValueRowV2(props: KeyValueRowV2Props) {
  const [split, rest] = splitProps(props, ["label", "value", "description", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="key-value-row-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <dt data-slot="label">{split.label}</dt>
      <dd data-slot="value">{split.value}</dd>
      <Show when={split.description}>
        <span data-slot="description">{split.description}</span>
      </Show>
    </div>
  )
}
