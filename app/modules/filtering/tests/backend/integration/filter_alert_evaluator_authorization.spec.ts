import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { createFilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'
import { createSavedFilterView } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { PostgresFilterSavedViewAuthorization } from '#modules/filtering/infra/adapters/saved-filter-views/postgres_filter_saved_view_authorization'
import { PostgresFilterAlertEvaluator } from '#modules/filtering/infra/adapters/filter-alert/postgres_filter_alert_evaluator'
import { PostgresFilterSavedViewRepository } from '#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository'
import type { QueryCriteriaResponse } from '#modules/filtering/public_contracts/filter_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Filter alert evaluator authorization', (group) => {


  group.setup(async () => { await setupApp() })
  group.each.teardown(() => cleanupTestData())
  group.teardown(() => teardownApp())

  test('stops evaluating after a granted subscriber is revoked', async ({ assert }) => {
    const owner = await UserFactory.createSuperadmin()
    const subscriber = await UserFactory.createSuperadmin()
    const viewId = testId()
    const alertId = testId()
    const now = '2026-08-09T00:00:00.000Z'
    const view = createSavedFilterView({
      id: viewId,
      name: 'Authorization evaluator fixture',
      description: null,
      ownerId: owner.id,
      visibility: 'private',
      organizationId: null,
      teamId: null,
      context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 },
      semanticState: { filter: null, textQuery: null, sort: [], projection: [] },
      presentationState: {},
      isDefault: false,
      isPinned: false,
      alertState: { status: 'active', reason: null },
      createdAt: now,
      updatedAt: now,
      lastSuccessfulMigrationVersion: 1,
    }, {}, new NodeFilterHashGenerator())
    const views = new PostgresFilterSavedViewRepository()
    await db.transaction(async (transaction) => {
      await views.create({ owner: { type: 'user', id: owner.id }, view }, transaction)
    })
    await db.table('filter_saved_view_grants').insert({
      saved_view_id: viewId,
      grantee_type: 'user',
      grantee_id: subscriber.id,
      can_read: true,
      can_subscribe: true,
      can_edit: false,
      can_share: false,
      created_by: owner.id,
    })
    const alert = createFilterAlert({
      id: alertId,
      savedViewId: viewId,
      ownerId: owner.id,
      savedViewLockVersion: 1,
      intervalMinutes: 30,
      timezone: 'UTC',
      now,
    })
    const calls: string[] = []
    const response: QueryCriteriaResponse<Record<string, unknown>> = {
      context: 'tasks.discovery.public',
      schemaVersion: 1,
      canonicalCriteria: { context: 'tasks.discovery.public', schemaVersion: 1, sort: [], page: { size: 100 } },
      hits: [],
      total: { value: 0, relation: 'eq' },
      facets: [],
      suggestions: [],
      diagnostics: [],
      page: {},
      execution: { provider: 'reference', degraded: false, partial: false, requestId: 'alert-test' },
    }
    const query = {
      execute: <T = unknown>(): Promise<QueryCriteriaResponse<T>> => {
        calls.push('executed')
        return Promise.resolve({ ...response, hits: [] as readonly T[] })
      },
    }
    const evaluator = new PostgresFilterAlertEvaluator(
      views,
      new PostgresFilterSavedViewAuthorization(),
      query,
      { resolve: () => Promise.resolve({ kind: 'user', id: subscriber.id }) }
    )

    const allowed = await evaluator.evaluate(alert, { now })
    assert.equal(allowed.providerState, 'healthy')
    assert.deepEqual(calls, ['executed'])

    await db.from('filter_saved_view_grants').where('saved_view_id', viewId).where('grantee_id', subscriber.id).update({ revoked_at: now })
    const revokedGrant = (await db.from('filter_saved_view_grants').where('saved_view_id', viewId).where('grantee_id', subscriber.id).first()) as { revoked_at: string | null } | undefined
    assert.isNotNull(revokedGrant?.revoked_at)
    const currentRecord = await views.findById(viewId)
    assert.notEqual(currentRecord?.owner.id, subscriber.id)
    const activeGrantCount = (await db.from('filter_saved_view_grants').where('saved_view_id', viewId).where('grantee_id', subscriber.id).whereNull('revoked_at').count('* as total').first()) as { total: string | number } | undefined
    assert.equal(activeGrantCount?.total, '0')
    if (currentRecord === null) throw new Error('saved view disappeared during authorization test')
    assert.isFalse(await new PostgresFilterSavedViewAuthorization().canPerform({ principal: { kind: 'user', id: subscriber.id }, action: 'subscribe', record: currentRecord }))
    const revoked = await evaluator.evaluate(alert, { now: '2026-08-09T00:30:00.000Z' })
    assert.equal(revoked.providerState, 'unavailable')
    assert.deepEqual(calls, ['executed'])
  })
})
