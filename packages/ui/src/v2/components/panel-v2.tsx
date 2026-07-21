import { type ComponentProps, type JSX, splitProps } from "solid-js"
import "./panel-v2.css"

export type PanelDensity = "compact" | "default" | "comfortable"

export interface PanelV2Props extends ComponentProps<"div"> {
  density?: PanelDensity
  raised?: boolean
}

export function PanelV2(props: PanelV2Props) {
  const [split, rest] = splitProps(props, ["density", "raised", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="panel-v2"
      data-density={split.density ?? "default"}
      data-raised={split.raised ? "" : undefined}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    />
  )
}

export interface PanelHeaderV2Props extends ComponentProps<"div"> {
  actions?: JSX.Element
}

export function PanelHeaderV2(props: PanelHeaderV2Props) {
  const [split, rest] = splitProps(props, ["actions", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="panel-header-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    >
      {rest.children}
      <div data-slot="actions">{split.actions}</div>
    </div>
  )
}
