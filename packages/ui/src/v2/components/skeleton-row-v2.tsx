import { type ComponentProps, splitProps } from "solid-js"
import { SkeletonBlockV2 } from "./skeleton-block-v2"
import "./skeleton-row-v2.css"

export interface SkeletonRowV2Props extends ComponentProps<"div"> {
  lines?: number
  hasLeading?: boolean
}

export function SkeletonRowV2(props: SkeletonRowV2Props) {
  const [split, rest] = splitProps(props, ["lines", "hasLeading", "class", "classList"])
  const lineCount = () => Math.max(1, split.lines ?? 2)

  return (
    <div
      {...rest}
      data-component="skeleton-row-v2"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      aria-hidden="true"
    >
      {split.hasLeading && <SkeletonBlockV2 circle width="32px" height="32px" />}
      <div data-slot="content">
        <SkeletonBlockV2 width="60%" height="12px" />
        {Array.from({ length: lineCount() - 1 }).map(() => (
          <SkeletonBlockV2 width="100%" height="10px" />
        ))}
      </div>
    </div>
  )
}
