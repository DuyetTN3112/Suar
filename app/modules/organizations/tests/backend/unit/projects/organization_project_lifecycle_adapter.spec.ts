import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import { OrganizationProjectLifecycleAdapter } from '#composition/organizations/projects/adapters/organization_project_lifecycle_adapter'

test.group('Organization project lifecycle adapter', () => {
  test('uses the non-deleted count for soft-delete eligibility', async ({ assert }) => {
    const trx = Symbol('transaction') as unknown as TransactionClientContract
    const calls: string[] = []
    const adapter = new OrganizationProjectLifecycleAdapter({
      countNonDeletedByOrgIds: (organizationIds, receivedTrx) => {
        calls.push('non_deleted')
        assert.deepEqual(organizationIds, ['org-1'])
        assert.strictEqual(receivedTrx, trx)
        return Promise.resolve(new Map([['org-1', 3]]))
      },
      countAllByOrgIds: () => {
        calls.push('all')
        return Promise.resolve(new Map())
      },
    })

    assert.equal(await adapter.countNonDeletedProjects('org-1', trx), 3)
    assert.deepEqual(calls, ['non_deleted'])
  })

  test('counts soft-deleted project rows when evaluating permanent deletion', async ({
    assert,
  }) => {
    const trx = Symbol('transaction') as unknown as TransactionClientContract
    const calls: string[] = []
    const adapter = new OrganizationProjectLifecycleAdapter({
      countNonDeletedByOrgIds: () => {
        calls.push('non_deleted')
        return Promise.resolve(new Map())
      },
      countAllByOrgIds: (organizationIds, receivedTrx) => {
        calls.push('all')
        assert.deepEqual(organizationIds, ['org-1'])
        assert.strictEqual(receivedTrx, trx)
        return Promise.resolve(new Map([['org-1', 2]]))
      },
    })

    assert.equal(await adapter.countRetainedProjects('org-1', trx), 2)
    assert.deepEqual(calls, ['all'])
  })

  test('returns zero when the repository has no matching organization row', async ({
    assert,
  }) => {
    const adapter = new OrganizationProjectLifecycleAdapter({
      countNonDeletedByOrgIds: () => Promise.resolve(new Map()),
      countAllByOrgIds: () => Promise.resolve(new Map()),
    })

    assert.equal(await adapter.countNonDeletedProjects('missing-org'), 0)
    assert.equal(await adapter.countRetainedProjects('missing-org'), 0)
  })
})
