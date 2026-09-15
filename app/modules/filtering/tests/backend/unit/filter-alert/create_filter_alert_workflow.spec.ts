import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import { CreateFilterAlertWorkflow } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_workflow'

const recordObj = {
  view: { id: 'view-1', context: { key: 'tasks.discovery.public' } },
  lockVersion: 4,
}
const record = recordObj as never

test.group('Unit | Create filter alert workflow', () => {
  test('owns view loading, execution probing, policy construction, and creation as one intent', async ({ assert }) => {
    let receivedPolicy: unknown
    const workflow = new CreateFilterAlertWorkflow(
      { execute: () => Promise.resolve(record) },
      {
        execute: () => {
          const executionResult = { execution: { degraded: true, partial: false }, total: { relation: 'gte' } }
          return Promise.resolve(executionResult as never)
        },
      },
      {
        getEffectiveDefinition: () => {
          const definition = { capabilities: { alerts: true }, limits: { maxCost: 7 } }
          return Promise.resolve(definition as never)
        },
      },
      {
        executeAndWrap: (input) => {
          receivedPolicy = input.policy
          const alertResult = { alert: { id: 'alert-1' }, lockVersion: 1 }
          return Promise.resolve(Result.ok(alertResult as never))
        },
      }
    )

    const result = await workflow.executeAndWrap({
      principal: { kind: 'user', id: 'user-1' },
      viewId: 'view-1',
      intervalMinutes: 30,
      timezone: 'UTC',
      now: '2026-08-09T00:00:00.000Z',
      alertId: 'alert-1',
      requestId: 'request-1',
    })

    assert.equal(result.getValue().alert.id, 'alert-1')
    assert.deepEqual(receivedPolicy, {
      hasSubscriptionPermission: true,
      contextAlertsEnabled: true,
      providerState: 'degraded',
      totalRelation: 'gte',
      queryCost: 0,
      maxQueryCost: 7,
    })
  })
})
