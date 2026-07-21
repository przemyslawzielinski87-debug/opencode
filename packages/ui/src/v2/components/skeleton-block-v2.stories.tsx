import { SkeletonBlockV2 } from "./skeleton-block-v2"

const docs = `### SkeletonBlockV2
Static placeholder block; shimmer is disabled when reduced motion is preferred.`

export default {
  title: "UI V2 Enterprise/SkeletonBlock",
  id: "components-skeleton-block-v2",
  component: SkeletonBlockV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => <SkeletonBlockV2 width="200px" height="16px" />,
}

export const Circle = {
  render: () => <SkeletonBlockV2 width="32px" height="32px" circle />,
}
