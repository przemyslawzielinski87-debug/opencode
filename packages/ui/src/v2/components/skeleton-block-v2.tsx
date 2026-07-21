import { type ComponentProps, splitProps } from "solid-js"
import "./skeleton-block-v2.css"

export interface SkeletonBlockV2Props extends ComponentProps<"div"> {
  width?: string
  height?: string
  circle?: boolean
}

export function SkeletonBlockV2(props: SkeletonBlockV2Props) {
  const [split, rest] = splitProps(props, ["width", "height", "circle", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="skeleton-block-v2"
      data-circle={split.circle ? "" : undefined}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      style={{
        width: split.width,
        height: split.height,
      }}
      aria-hidden="true"
    />
  )
}
