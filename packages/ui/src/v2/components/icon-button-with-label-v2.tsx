import { type ComponentProps, splitProps } from "solid-js"
import { Icon, type IconProps } from "./icon"
import "./icon-button-with-label-v2.css"

export interface IconButtonWithLabelV2Props extends ComponentProps<"button"> {
  icon: IconProps["name"]
  label: string
  iconSize?: IconProps["size"]
}

export function IconButtonWithLabelV2(props: IconButtonWithLabelV2Props) {
  const [split, rest] = splitProps(props, ["icon", "label", "iconSize", "class", "classList"])

  return (
    <button
      {...rest}
      data-component="icon-button-with-label-v2"
      type="button"
      classList={{
        ...split.classList,
        [split.class ?? ""]: !!split.class,
      }}
      aria-label={split.label}
    >
      <Icon name={split.icon} size={split.iconSize ?? "normal"} aria-hidden="true" />
      <span data-slot="label">{split.label}</span>
    </button>
  )
}
