import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import GetProjectDetailApiController from '#modules/projects/controllers/project-context/get_project_detail_api_controller'

test.group('Project detail Result boundary', () => {
  test('throws the expected query failure at the HTTP boundary', async ({ assert }) => {
    const failure = new NotFoundException('Project not found')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeDetail: () => query,
    } as unknown as ProjectQueryFactory
    const controller = new GetProjectDetailApiController(queries)
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      params: { projectId: 'project-1' },
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
