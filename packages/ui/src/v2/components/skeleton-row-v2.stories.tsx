import { SkeletonRowV2 } from "./skeleton-row-v2"

const docs = `### SkeletonRowV2
Placeholder row with optional leading circle and multiple lines.`

export default {
  title: "UI V2 Enterprise/SkeletonRow",
  id: "components-skeleton-row-v2",
  component: SkeletonRowV2,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: docs } } },
}

export const Default = {
  render: () => <SkeletonRowV2 />,
}

export const WithLeading = {
  render: () => <SkeletonRowV2 hasLeading lines={3} />,
}
