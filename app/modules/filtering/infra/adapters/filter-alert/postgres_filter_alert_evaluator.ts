import { createHash } from 'node:crypto'

import type { FilterAlertEvaluation, FilterAlertEvaluator } from '#modules/filtering/actions/ports/outbound/filter_alert_evaluator'
import type { FilterAlertPrincipalResolver } from '#modules/filtering/actions/ports/outbound/filter_alert_principal_resolver'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'

function unavailable(): FilterAlertEvaluation {
  return {
    providerState: 'unavailable', totalRelation: 'unknown', watermark: 'unavailable',
    observationWindow: 'unavailable', resultIdentityHash: 'unavailable',
    safeSummary: { resultCount: null, provider: 'unavailable', degraded: true, partial: true },
  }
}

function identity(value: unknown): string | null {
  if (value === null || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const candidate = row['entityId'] ?? row['id'] ?? row['task_id']
  return typeof candidate === 'string' || typeof candidate === 'number' ? String(candidate) : null
}

export class PostgresFilterAlertEvaluator implements FilterAlertEvaluator {
  constructor(
    private readonly views: Pick<FilterSavedViewRepository, 'findById'>,
    private readonly authorization: FilterSavedViewAuthorization,
    private readonly query: Pick<ExecuteSavedFilterViewQuery, 'execute'>,
    private readonly principals: FilterAlertPrincipalResolver,
  ) {}

  async evaluate(alert: FilterAlert, input: { readonly now?: string } = {}): Promise<FilterAlertEvaluation> {
    const record = await this.views.findById(alert.savedViewId)
    if (record === null || record.migrationState !== 'current' || record.deletedAt !== null) return unavailable()
    const principal = await this.principals.resolve({ alert, record })
    if (principal === null) return unavailable()
    if (!(await this.authorization.canPerform({ principal, action: 'subscribe', record }))) return unavailable()
    try {
      const now = input.now ?? new Date().toISOString()
      const response = await this.query.execute({ principal, viewId: alert.savedViewId, requestId: `alert:${alert.id}:${now}`, page: { size: 100 } })
      const ids = response.hits.map(identity)
      if (ids.some((id: string | null) => id === null)) return unavailable()
      const resultIdentityHash = createHash('sha256').update(JSON.stringify([...ids].sort()), 'utf8').digest('hex')
      const providerState = response.execution.degraded || response.execution.partial ? 'degraded' : 'healthy'
      return {
        providerState,
        totalRelation: response.total.relation,
        observationWindow: now,
        resultIdentityHash,
        watermark: createHash('sha256').update(`${record.lockVersion}\u0000${now}\u0000${resultIdentityHash}`, 'utf8').digest('hex'),
        safeSummary: { resultCount: response.hits.length, totalRelation: response.total.relation, provider: response.execution.provider, degraded: response.execution.degraded, partial: response.execution.partial },
      }
    } catch {
      return unavailable()
    }
  }
}
