import { type ComponentProps, splitProps } from "solid-js"
import "./surface-card-v2.css"

export interface SurfaceCardV2Props extends ComponentProps<"div"> {
  density?: "compact" | "default" | "comfortable"
}

export function SurfaceCardV2(props: SurfaceCardV2Props) {
  const [split, rest] = splitProps(props, ["density", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="surface-card-v2"
      data-density={split.density ?? "default"}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    />
  )
}
