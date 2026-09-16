import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import GetRoleStaffingCandidatesController from '#modules/projects/controllers/project-members/get_role_staffing_candidates_controller'

test.group('Role staffing Result boundary', () => {
  test('throws expected query failures at the HTTP boundary', async ({ assert }) => {
    const failure = new NotFoundException('Role not found in project')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeRoleStaffingCandidates: () => query,
    } as unknown as ProjectQueryFactory
    const controller = new GetRoleStaffingCandidatesController(queries)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      params: { projectId: 'project-1', roleId: 'role-1' },
      request: {
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: {
        get: () => undefined,
      },
    }

    let thrown: unknown
    try {
      await controller.handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
