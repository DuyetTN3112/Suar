import type { FilterAlertEvaluation } from '#modules/filtering/actions/ports/outbound/filter_alert_evaluator'
import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'

export interface FilterAlertDelivery {
  deliver(input: {
    readonly alert: FilterAlert
    readonly evaluation: FilterAlertEvaluation
    readonly idempotencyKey: string
  }): Promise<void>
}
