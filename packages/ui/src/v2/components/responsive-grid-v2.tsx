import { type ComponentProps, splitProps } from "solid-js"
import "./responsive-grid-v2.css"

export interface ResponsiveGridV2Props extends ComponentProps<"div"> {
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: "1" | "2" | "3" | "4" | "5" | "6"
}

export function ResponsiveGridV2(props: ResponsiveGridV2Props) {
  const [split, rest] = splitProps(props, ["columns", "gap", "class", "classList"])

  return (
    <div
      {...rest}
      data-component="responsive-grid-v2"
      data-columns={split.columns ?? 3}
      data-gap={split.gap ?? "3"}
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
    />
  )
}
