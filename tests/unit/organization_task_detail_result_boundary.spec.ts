import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationTaskQueryFactory } from '#modules/organizations/actions/ports/inbound/tasks/organization_task_query_factory'
import OrgShowTaskController from '#modules/organizations/controllers/tasks/show_task_controller'

test.group('Organization task detail Result boundary', () => {
  test('controller unwraps the task detail query Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Task not found')
    const actions = {
      makeDetail: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationTaskQueryFactory
    const ctx = {
      params: { taskId: 'task-1' },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
      response: { redirect: () => undefined },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new OrgShowTaskController(actions).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
