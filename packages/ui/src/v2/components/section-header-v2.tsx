import { type ComponentProps, type JSX, Show, splitProps } from "solid-js"
import "./section-header-v2.css"

export interface SectionHeaderV2Props extends ComponentProps<"div"> {
  title: string
  subtitle?: string
  actions?: JSX.Element
}

export function SectionHeaderV2(props: SectionHeaderV2Props) {
  const [split, rest] = splitProps(props, ["title", "subtitle", "actions", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="section-header-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      <div data-slot="text">
        <h2 data-slot="title">{split.title}</h2>
        <Show when={split.subtitle}>
          <p data-slot="subtitle">{split.subtitle}</p>
        </Show>
      </div>
      <Show when={split.actions}>
        <div data-slot="actions">{split.actions}</div>
      </Show>
    </div>
  )
}
