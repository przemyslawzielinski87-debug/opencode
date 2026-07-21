import { type ComponentProps, splitProps } from "solid-js"
import "./responsive-stack-v2.css"

export interface ResponsiveStackV2Props extends ComponentProps<"div"> {
  gap?: "1" | "2" | "3" | "4" | "5" | "6"
  direction?: "row" | "column"
  wrap?: boolean
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between"
}

export function ResponsiveStackV2(props: ResponsiveStackV2Props) {
  const [split, rest] = splitProps(props, [
    "gap",
    "direction",
    "wrap",
    "align",
    "justify",
    "class",
    "classList",
  ])

  return (
    <div
      {...rest}
      data-component="responsive-stack-v2"
      data-gap={split.gap ?? "3"}
      data-direction={split.direction ?? "column"}
      data-wrap={split.wrap ? "" : undefined}
      data-align={split.align ?? "stretch"}
      data-justify={split.justify ?? "start"}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    />
  )
}
