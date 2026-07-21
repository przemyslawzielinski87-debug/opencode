import { type ComponentProps, Match, Switch } from "solid-js"
import { ErrorStateV2, type ErrorStateV2Props } from "./error-state-v2"
import { UnavailableStateV2, type UnavailableStateV2Props } from "./unavailable-state-v2"
import "./retry-state-v2.css"

export type RetryStateV2Status = "error" | "unavailable"

export interface RetryStateV2Props extends ComponentProps<"div"> {
  status: RetryStateV2Status
  title: string
  description?: string
  retryLabel?: string
  onRetry?: () => void
}

export function RetryStateV2(props: RetryStateV2Props) {
  return (
    <Switch>
      <Match when={props.status === "error"}>
        <ErrorStateV2
          {...(props as ErrorStateV2Props)}
          data-component="retry-state-v2"
        />
      </Match>
      <Match when={props.status === "unavailable"}>
        <UnavailableStateV2
          {...(props as UnavailableStateV2Props)}
          data-component="retry-state-v2"
        />
      </Match>
    </Switch>
  )
}
