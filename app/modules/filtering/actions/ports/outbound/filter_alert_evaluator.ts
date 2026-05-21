import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'

export interface FilterAlertEvaluation {
  readonly providerState: 'healthy' | 'degraded' | 'unavailable'
  readonly totalRelation: 'eq' | 'gte' | 'unknown'
  readonly watermark: string
  readonly observationWindow: string
  readonly resultIdentityHash: string
  readonly safeSummary: Readonly<Record<string, string | number | boolean | null>>
}

export interface FilterAlertEvaluator {
  evaluate(alert: FilterAlert, input?: { readonly now?: string }): Promise<FilterAlertEvaluation>
}
