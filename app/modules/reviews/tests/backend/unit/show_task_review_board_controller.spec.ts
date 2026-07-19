import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import type { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import ShowTaskReviewBoardController from '#modules/reviews/controllers/task-review/show_task_review_board_controller'
import { emptyTaskReviewBoardColumns } from '#modules/reviews/domain/task_review_workflow'

test.group('Unit | Show task review board controller', () => {
  test('delegates the endpoint to one page query and maps its transition', async ({ assert }) => {
    let pageQueryFactoryCalls = 0
    let executeCalls = 0
    const actions = {
      makeGetTaskReviewBoardPageQuery() {
        pageQueryFactoryCalls += 1
        return {
          executeAndWrap(input: { projectId: string; requestedTaskId: string | null }) {
            executeCalls += 1
            assert.deepEqual(input, {
              projectId: 'project-1',
              requestedTaskId: 'task-1',
            })
            return Promise.resolve(Result.ok({
              board: {
                projectId: 'project-1',
                columns: emptyTaskReviewBoardColumns(),
              },
              selectedTaskId: null,
              detail: null,
              project: { id: 'project-1', name: 'Project' },
              workspaceTransition: { currentProjectId: 'project-1' },
            }))
          },
        }
      },
    } as unknown as ReviewActionFactory
    const sessionTransitions: Array<[string, string]> = []
    let sessionCommits = 0
    let renderedPage: string | null = null
    let renderedProps: Record<string, unknown> | null = null
    const ctx = {
      params: { projectId: 'project-1' },
      auth: {
        user: {
          id: 'user-1',
          current_organization_id: 'org-1',
        },
      },
      currentOrganizationId: 'org-1',
      request: {
        input(key: string) {
          return key === 'task_id' ? 'task-1' : undefined
        },
        ip() {
          return '127.0.0.1'
        },
        header() {
          return 'test'
        },
      },
      session: {
        get() {
          return null
        },
        put(key: string, value: string) {
          sessionTransitions.push([key, value])
        },
        commit() {
          sessionCommits += 1
          return Promise.resolve()
        },
      },
      response: {
        redirect() {
          throw new Error('Unexpected redirect')
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

    await new ShowTaskReviewBoardController(actions, workspaceAccess(true)).handle(ctx as never)

    assert.equal(pageQueryFactoryCalls, 1)
    assert.equal(executeCalls, 1)
    assert.deepEqual(sessionTransitions, [['current_project_id', 'project-1']])
    assert.equal(sessionCommits, 1)
    assert.equal(renderedPage, 'reviews/task-board')
    assert.deepInclude(renderedProps, {
      projectId: 'project-1',
      selectedTaskId: null,
      detail: null,
      workspaceMode: 'project',
    })
  })

  test('moves an ordinary member from a project URL to the personal review board', async ({
    assert,
  }) => {
    let redirectTo: string | null = null
    const actions = {
      makeGetTaskReviewBoardPageQuery() {
        throw new Error('The project board query must not run for a personal-only member')
      },
    } as unknown as ReviewActionFactory
    const ctx = {
      params: { projectId: 'project-1' },
      auth: { user: { id: 'member-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input(key: string) {
          return key === 'task_id' ? 'task-1' : undefined
        },
      },
      response: {
        redirect(path: string) {
          redirectTo = path
        },
      },
      session: { get: () => null },
      inertia: { render: () => { throw new Error('Unexpected project workspace render') } },
    }

    await new ShowTaskReviewBoardController(actions, workspaceAccess(false)).handle(ctx as never)

    assert.equal(redirectTo, '/reviews/tasks?task_id=task-1')
  })
})

function workspaceAccess(canEnter: boolean): ProjectWorkspaceAccessReader {
  return {
    canEnter: () => Promise.resolve(canEnter),
    listEnterableByOrganization: () => Promise.resolve([]),
  }
}
