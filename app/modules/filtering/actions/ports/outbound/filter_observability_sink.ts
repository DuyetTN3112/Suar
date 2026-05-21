import type { FilterObservabilityEvent } from '#modules/filtering/observability/filtering-observability/filter_event_factory'

export interface FilterObservabilitySink {
  record(event: FilterObservabilityEvent): void | Promise<void>
}

export const noopFilterObservabilitySink: FilterObservabilitySink = {
  record: () => undefined,
}
