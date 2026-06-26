import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import ListProjectMemberCandidatesController from '#modules/projects/controllers/project-members/list_project_member_candidates_controller'

test.group('Project member candidates Result boundary', () => {
  test('throws expected query failures at the HTTP boundary', async ({ assert }) => {
    const failure = new NotFoundException('Project not found')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeMemberCandidates: () => query,
    } as unknown as ProjectQueryFactory
    const controller = new ListProjectMemberCandidatesController(queries)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      params: { projectId: 'project-1' },
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
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
