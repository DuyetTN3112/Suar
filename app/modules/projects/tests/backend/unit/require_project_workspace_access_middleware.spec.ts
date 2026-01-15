import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import type { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import RequireProjectWorkspaceAccessMiddleware from '#modules/projects/middleware/require_project_workspace_access_middleware'

function makeContext(options: {
  paramsProjectId?: string
  requestProjectId?: string
}): HttpContext {
  return {
    auth: {
      user: {
        id: 'actor-1',
      },
    },
    currentOrganizationId: 'org-1',
    params: options.paramsProjectId ? { projectId: options.paramsProjectId } : {},
    request: {
      input(key: string) {
        return key === 'projectId' ? options.requestProjectId : undefined
      },
    },
    session: {
      get: () => undefined,
    },
  } as unknown as HttpContext
}

function makeReader(
  canEnter: (input: {
    organizationId: string
    projectId: string
    userId: string
  }) => Promise<boolean>
): ProjectWorkspaceAccessReader {
  return {
    canEnter,
    listEnterableByOrganization: () => Promise.resolve([]),
  }
}

test.group('RequireProjectWorkspaceAccessMiddleware', () => {
  test('blocks a route project when the actor cannot enter the shared workspace', async ({
    assert,
  }) => {
    const middleware = new RequireProjectWorkspaceAccessMiddleware(
      makeReader(() => Promise.resolve(false))
    )

    await assert.rejects(
      () => middleware.handle(makeContext({ paramsProjectId: 'project-1' }), async () => {}),
      /không có quyền truy cập không gian dự án/
    )
  })

  test('allows an authorized route project and calls the next handler', async ({ assert }) => {
    let nextCalled = false
    const middleware = new RequireProjectWorkspaceAccessMiddleware(
      makeReader(() => Promise.resolve(true))
    )

    await middleware.handle(makeContext({ paramsProjectId: 'project-1' }), () => {
      nextCalled = true
      return Promise.resolve()
    })

    assert.isTrue(nextCalled)
  })

  test('guards project switching using the request payload project id', async ({ assert }) => {
    let checkedProjectId: string | null = null
    const middleware = new RequireProjectWorkspaceAccessMiddleware(
      makeReader((input) => {
        checkedProjectId = input.projectId
        return Promise.resolve(true)
      })
    )

    await middleware.handle(
      makeContext({ requestProjectId: 'project-from-body' }),
      () => Promise.resolve()
    )

    assert.equal(checkedProjectId, 'project-from-body')
  })
})
