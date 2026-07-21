import { type ComponentProps, splitProps } from "solid-js"
import { Icon } from "./icon"
import "./environment-badge-v2.css"

export interface EnvironmentBadgeV2Props extends ComponentProps<"span"> {
  environment?: string
}

export function EnvironmentBadgeV2(props: EnvironmentBadgeV2Props) {
  const [split, rest] = splitProps(props, ["environment", "class", "classList"])

  return (
    <span
      {...rest}
      data-component="environment-badge-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      title={split.environment}
    >
      <Icon name="globe" size="small" aria-hidden="true" />
      {split.environment ?? "Default"}
    </span>
  )
}
