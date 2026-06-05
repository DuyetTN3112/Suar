import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import { CreateFilterAlertWorkflow } from '#modules/filtering/actions/commands/filter-alert/create_filter_alert_workflow'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const record = {
  view: { id: 'view-1', context: { key: 'tasks.discovery.public' } },
  lockVersion: 4,
} as never

test.group('Unit | Create filter alert workflow', () => {
  test('owns view loading, execution probing, policy construction, and creation as one intent', async ({ assert }) => {
    let receivedPolicy: unknown
    const workflow = new CreateFilterAlertWorkflow(
      { execute: () => Promise.resolve(record) },
      {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        execute: () => Promise.resolve({ execution: { degraded: true, partial: false }, total: { relation: 'gte' } } as never),
      },
      {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        getEffectiveDefinition: () => Promise.resolve({ capabilities: { alerts: true }, limits: { maxCost: 7 } } as never),
      },
      {
        executeAndWrap: (input) => {
          receivedPolicy = input.policy
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          return Promise.resolve(Result.ok({ alert: { id: 'alert-1' }, lockVersion: 1 } as never))
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
