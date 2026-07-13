import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import type { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import ShowSprintReverseReviewBoardController from '#modules/reviews/controllers/sprint-review/show_sprint_reverse_review_board_controller'
import ShowTaskReviewBoardController from '#modules/reviews/controllers/task-review/show_task_review_board_controller'
import { emptyTaskReviewBoardColumns } from '#modules/reviews/domain/task-review/task_review_workflow'
import { getApp, setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Unit | Personal review board routes', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  test('registers the personal aliases for all review boards', async ({ assert }) => {
    const { default: router } = await import('@adonisjs/core/services/router')

    for (const path of ['/reviews/tasks', '/reviews/assigners', '/reviews/environment']) {
      assert.isNotNull(router.match(path, 'GET', true), `Expected ${path} to be registered`)
    }
  })

  test('keeps both board controllers resolvable by the application container', async ({
    assert,
  }) => {
    const app = getApp()
    const [taskController, sprintController] = await Promise.all([
      app.container.make(ShowTaskReviewBoardController),
      app.container.make(ShowSprintReverseReviewBoardController),
    ])

    assert.instanceOf(taskController, ShowTaskReviewBoardController)
    assert.instanceOf(sprintController, ShowSprintReverseReviewBoardController)
  })

  test('uses the current session project for the personal task review board', async ({ assert }) => {
    let renderedProps: Record<string, unknown> | null = null
    const actions = {
      makeGetTaskReviewBoardPageQuery() {
        return {
          executeAndWrap(input: { projectId: string; requestedTaskId: string | null }) {
            assert.deepEqual(input, { projectId: 'project-1', requestedTaskId: null })
            return Promise.resolve(Result.ok({
              board: { projectId: 'project-1', columns: emptyTaskReviewBoardColumns() },
              selectedTaskId: null,
              detail: null,
              project: { id: 'project-1', name: 'Project One' },
              workspaceTransition: { currentProjectId: 'project-1' },
            }))
          },
        }
      },
    } as unknown as ReviewActionFactory

    const ctx = makeContext({
      url: '/reviews/tasks',
      sessionProjectId: 'project-1',
      render: (_page, props) => {
        renderedProps = props
      },
    })

    await new ShowTaskReviewBoardController(actions, workspaceAccess()).handle(ctx as never)

    assert.deepInclude(renderedProps, {
      projectId: 'project-1',
      workspaceMode: 'personal',
    })
  })

  test('renders an empty task review board when no project is available', async ({ assert }) => {
    let renderedProps: Record<string, unknown> | null = null
    const ctx = makeContext({
      url: '/reviews/tasks',
      render: (_page, props) => {
        renderedProps = props
      },
    })

    const actions = {
      makeGetTaskReviewBoardPageQuery() {
        throw new Error('The page query must not run without a project')
      },
    }

    await new ShowTaskReviewBoardController(actions, workspaceAccess()).handle(ctx as never)

    assert.deepInclude(renderedProps, {
      projectId: null,
      selectedTaskId: null,
      detail: null,
      workspaceMode: 'personal',
      projectContext: { selectedProject: null },
    })
    const board = renderedProps?.['board'] as { columns: unknown[] } | undefined
    if (!board) throw new Error('Expected an empty task review board payload')
    assert.lengthOf(board.columns, emptyTaskReviewBoardColumns().length)
  })

  for (const [url, reviewType, targetType] of [
    ['/reviews/assigners', 'manager', 'assigner'],
    ['/reviews/environment', 'environment', 'environment'],
  ] as const) {
    test(`renders an empty ${reviewType} board when no project is available`, async ({ assert }) => {
      let renderedProps: Record<string, unknown> | null = null
      const ctx = makeContext({
        url,
        render: (_page, props) => {
          renderedProps = props
        },
      })

      const actions = {
        makeGetSprintReverseReviewPageQuery() {
          throw new Error('The page query must not run without a project')
        },
      }

      await new ShowSprintReverseReviewBoardController(actions, workspaceAccess()).handle(ctx as never)

      assert.deepInclude(renderedProps, {
        sprintId: null,
        reviewWindow: null,
        reviewType,
        targetType,
        workspaceMode: 'personal',
        projectContext: { selectedProject: null },
      })
    })
  }
})

function workspaceAccess(): ProjectWorkspaceAccessReader {
  return {
    canEnter: () => Promise.resolve(false),
    listEnterableByOrganization: () => Promise.resolve([]),
  }
}

function makeContext(input: {
  url: string
  sessionProjectId?: string
  render: (page: string, props: Record<string, unknown>) => void
}) {
  return {
    params: {},
    auth: { user: { id: 'user-1', current_organization_id: null } },
    currentOrganizationId: null,
    currentOrganizationRole: null,
    request: {
      input: () => undefined,
      url: () => input.url,
      ip: () => '127.0.0.1',
      header: () => 'test',
    },
    session: {
      get: () => input.sessionProjectId ?? null,
      put: () => undefined,
      commit: () => Promise.resolve(),
    },
    response: {
      redirect: () => {
        throw new Error('Unexpected redirect')
      },
    },
    inertia: {
      render: input.render,
    },
  }
}
