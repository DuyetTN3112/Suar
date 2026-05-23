import { test } from '@japa/runner'

import type { FilterAlertPrincipalResolver } from '#modules/filtering/actions/ports/outbound/filter_alert_principal_resolver'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRecord, FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { ExecuteSavedFilterViewQuery } from '#modules/filtering/actions/queries/saved-filter-views/execute_saved_filter_view_query'
import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { PostgresFilterAlertEvaluator } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_evaluator'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type { QueryCriteriaResponse } from '#modules/filtering/public_contracts/filter_query'

const alert: FilterAlert = {
  id: 'alert-1', savedViewId: 'view-1', ownerId: 'user-1', savedViewLockVersion: 3,
  status: 'active', pauseReason: null, intervalMinutes: 30, timezone: 'UTC',
  lastSuccessfulWatermark: null, lastSuccessfulAt: null, nextRunAt: '2026-08-09T00:00:00.000Z',
  retryCount: 0, leaseOwnerId: null, leaseExpiresAt: null, fenceToken: null, deletedAt: null,
}

function record(): FilterSavedViewRecord {
  const value = {
    owner: { type: 'user' as const, id: 'user-1' }, normalizedName: 'view', lockVersion: 3,
    migrationState: 'current' as const, deletedAt: null,
    view: {
      id: 'view-1', name: 'View', description: null, ownerId: 'user-1', visibility: 'private' as const,
      organizationId: null, teamId: null, context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
      semanticState: { textQuery: null, filter: null, sort: [{ field: 'createdAt', direction: 'desc' as const }], projection: [] },
      presentationState: {}, semanticChecksum: 'checksum', canonicalPayloadBytes: 1, isDefault: false, isPinned: false,
      alertState: { status: 'active' as const, reason: null }, createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z', lastSuccessfulMigrationVersion: 1,
    },
  } satisfies FilterSavedViewRecord
  return value
}

class Views implements Pick<FilterSavedViewRepository, 'findById'> {
  findById(): Promise<FilterSavedViewRecord> { return Promise.resolve(record()) }
}

class Authorization implements FilterSavedViewAuthorization {
  subscribeAllowed = true
  canPerformCalls: string[] = []
  canCreate() { return Promise.resolve(true) }
  canShareWith() { return Promise.resolve(true) }
  listAuthorizedViewIds() { return Promise.resolve([]) }
  canPerform(input: Parameters<FilterSavedViewAuthorization['canPerform']>[0]) {
    this.canPerformCalls.push(input.action)
    return Promise.resolve(input.action !== 'subscribe' || this.subscribeAllowed)
  }
}

class Principals implements FilterAlertPrincipalResolver {
  resolve() { return Promise.resolve<FilterPrincipal>({ kind: 'user', id: 'user-1' }) }
}

class SavedQuery {
  calls: FilterPrincipal[] = []
  response: QueryCriteriaResponse<Record<string, unknown>> = {
    context: 'tasks.discovery.public', schemaVersion: 1,
    canonicalCriteria: { context: 'tasks.discovery.public', schemaVersion: 1, sort: [], page: { size: 100 } },
    hits: [{ id: 'task-2', secret: 'must-not-escape' }, { id: 'task-1' }],
    total: { value: 2, relation: 'eq' }, facets: [], suggestions: [], diagnostics: [], page: {},
    execution: { provider: 'reference', degraded: false, partial: false, requestId: 'request-1' },
  }
  execute<T = unknown>(input: Parameters<ExecuteSavedFilterViewQuery['execute']>[0]): Promise<QueryCriteriaResponse<T>> {
    this.calls.push(input.principal)
    return Promise.resolve({ ...this.response, hits: this.response.hits as readonly T[] })
  }
}

test.group('Unit | Postgres filter alert evaluator', () => {
  test('re-authorizes and evaluates through the saved-view query while exposing only bounded identity data', async ({ assert }) => {
    const authorization = new Authorization()
    const query = new SavedQuery()
    const result = await new PostgresFilterAlertEvaluator(new Views(), authorization, query, new Principals()).evaluate(alert, { now: '2026-08-09T00:07:00.000Z' })

    assert.equal(result.providerState, 'healthy')
    assert.equal(result.totalRelation, 'eq')
    assert.equal(result.safeSummary['resultCount'], 2)
    assert.notProperty(result.safeSummary, 'secret')
    assert.deepEqual(query.calls[0], { kind: 'user', id: 'user-1' })
    assert.deepEqual(authorization.canPerformCalls, ['subscribe'])
    assert.match(result.resultIdentityHash, /^[a-f0-9]{64}$/)
  })
})

  test('fails closed when subscription authorization is revoked without executing the query', async ({ assert }) => {
    const authorization = new Authorization()
    authorization.subscribeAllowed = false
    const query = new SavedQuery()
    const result = await new PostgresFilterAlertEvaluator(new Views(), authorization, query, new Principals()).evaluate(alert)

    assert.equal(result.providerState, 'unavailable')
    assert.equal(result.totalRelation, 'unknown')
    assert.isEmpty(query.calls)
  })

  test('marks approximate or degraded provider output as degraded', async ({ assert }) => {
    const query = new SavedQuery()
    query.response = { ...query.response, total: { value: 2, relation: 'gte' }, execution: { ...query.response.execution, partial: true } }
    const result = await new PostgresFilterAlertEvaluator(new Views(), new Authorization(), query, new Principals()).evaluate(alert)
    assert.equal(result.providerState, 'degraded')
    assert.equal(result.totalRelation, 'gte')
    assert.equal(result.safeSummary['partial'], true)
  })
