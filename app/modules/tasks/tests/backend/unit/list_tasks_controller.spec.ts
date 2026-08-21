import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { TaskBoardQueryFactory } from '#modules/tasks/actions/ports/inbound/task_board_query_factory'
import ListTasksController from '#modules/tasks/controllers/list_tasks_controller'

test.group('Unit | List tasks controller', () => {
  test('renders the personal task board when no project is selected', async ({ assert }) => {
    let renderedPage: string | null = null
    let renderedProps: Record<string, unknown> | null = null
    let redirectPath: string | null = null

    const query = {
      executeAndWrap(input: { requested_project_id?: string }) {
        assert.isUndefined(input.requested_project_id)
        return Promise.resolve(Result.ok({
          projectContext: { selectedProject: { id: 'project-1', name: 'Project' } },
          tasks: { data: [], meta: {} },
        }))
      },
    }
    const boardQueries = {
      makeIndexPage() {
        return query
      },
    } as unknown as TaskBoardQueryFactory

    const ctx = {
      params: {},
      currentOrganizationId: 'org-1',
      currentOrganizationRole: 'org_member',
      auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
      request: {
        input() {
          return undefined
        },
        ip() {
          return '127.0.0.1'
        },
        header() {
          return 'test'
        },
      },
      session: {
        get(_key: string) {
          return undefined
        },
        put() {},
        commit() {
          return Promise.resolve()
        },
      },
      response: {
        redirect(path: string) {
          redirectPath = path
        },
      },
      inertia: {
        render(page: string, props: Record<string, unknown>) {
          renderedPage = page
          renderedProps = props
          return { page, props }
        },
      },
    }

    await new ListTasksController(boardQueries).handle(ctx as never)

    assert.isNull(redirectPath)
    assert.equal(renderedPage, 'tasks/index')
    assert.isNotNull(renderedProps)
    const props = renderedProps as unknown as Record<string, unknown>
    assert.equal(props['shellMode'], 'app')
    assert.equal(props['baseRoute'], '/tasks')
  })
})
