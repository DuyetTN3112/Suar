import { test } from '@japa/runner'

import { CreateFilterAlertCommand } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_command'
import type { FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import type { FilterSavedViewAuthorization } from '#modules/filtering/actions/ports/outbound/filter_saved_view_authorization'
import type { FilterSavedViewRepository } from '#modules/filtering/actions/ports/outbound/filter_saved_view_repository'
import type { FilterContextProvider } from '#modules/filtering/public_contracts/filter_context_provider'



const view = {
  view: { id: 'view-1', context: { key: 'tasks.discovery.public', owner: 'tasks', schemaVersion: 1 } },
  lockVersion: 4,
  migrationState: 'current' as const,
}

test.group('Unit | Create filter alert command', () => {
  test('requires subscribe authorization and persists the saved-view revision', async ({ assert }) => {
    const views = { findById: () => Promise.resolve(view) } as unknown as FilterSavedViewRepository
    const authorization = { canPerform: () => Promise.resolve(true) } as unknown as FilterSavedViewAuthorization
    const contexts = { getEffectiveDefinition: () => Promise.resolve({ key: 'tasks.discovery.public', ownerModule: 'tasks', version: 1, capabilities: { savedViews: true, alerts: true, sharedViews: true } }) } as unknown as FilterContextProvider
    let saved: { savedViewLockVersion: number } | undefined
    const alerts = { create: (alert: { savedViewLockVersion: number }) => { saved = alert; return Promise.resolve({ alert, lockVersion: 1 }) } } as unknown as FilterAlertRepository
    const result = await new CreateFilterAlertCommand(views, alerts, authorization, contexts).executeAndWrap({
      principal: { kind: 'user', id: 'user-1' }, viewId: 'view-1', intervalMinutes: 30, timezone: 'UTC',
      policy: { hasSubscriptionPermission: true, contextAlertsEnabled: true, providerState: 'healthy', totalRelation: 'eq', queryCost: 1, maxQueryCost: 2 },
      now: '2026-08-09T00:00:00.000Z', alertId: 'alert-1',
    })
    assert.equal(result.getValue().alert.savedViewLockVersion, 4)
    assert.equal(saved?.savedViewLockVersion, 4)
  })

  test('fails closed when policy is not eligible', async ({ assert }) => {
    const views = { findById: () => Promise.resolve(view) } as unknown as FilterSavedViewRepository
    const authorization = { canPerform: () => Promise.resolve(true) } as unknown as FilterSavedViewAuthorization
    const contexts = { getEffectiveDefinition: () => Promise.resolve({ key: 'tasks.discovery.public', ownerModule: 'tasks', version: 1, capabilities: { savedViews: true, alerts: true, sharedViews: true } }) } as unknown as FilterContextProvider
    const alerts = { create: () => Promise.reject(new Error('must not persist')) } as unknown as FilterAlertRepository
    await assert.rejects(() => new CreateFilterAlertCommand(views, alerts, authorization, contexts).executeAndWrap({
      principal: { kind: 'user', id: 'user-1' }, viewId: 'view-1', intervalMinutes: 30, timezone: 'UTC',
      policy: { hasSubscriptionPermission: true, contextAlertsEnabled: true, providerState: 'healthy', totalRelation: 'eq', queryCost: 1, maxQueryCost: 2 },
      now: '2026-08-09T00:00:00.000Z', alertId: 'alert-1',
    }))
  })
})
