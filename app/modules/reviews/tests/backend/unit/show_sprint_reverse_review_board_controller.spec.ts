import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import type { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import ShowSprintReverseReviewBoardController from '#modules/reviews/controllers/sprint-review/show_sprint_reverse_review_board_controller'
import {
  emptySprintReverseReviewBoardSection,
} from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'

test.group('Unit | Show sprint reverse review board controller', () => {
  test('renders a personal assigner review board from the selected project context', async ({
    assert,
  }) => {
    let renderedProps: Record<string, unknown> | null = null
    const actions = {
      makeGetSprintReverseReviewPageQuery() {
        return {
          executeAndWrap(input: { projectId: string; sprintId: string | null }) {
            assert.deepEqual(input, { projectId: 'project-1', sprintId: null })
            return Promise.resolve(Result.ok({
              sprintId: null,
              reviewWindow: null,
              board: {
                assigner: emptySprintReverseReviewBoardSection(),
                environment: emptySprintReverseReviewBoardSection(),
              },
              project: { id: 'project-1', name: 'Project' },
            }))
          },
        }
      },
    } as unknown as ReviewActionFactory
    const ctx = {
      params: { projectId: 'project-1' },
      auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: (key: string) => (key === 'workflow_id' ? 'workflow-1' : undefined),
        url: () => '/reviews/assigners',
        qs: () => ({ workflow_id: 'workflow-1' }),
        ip: () => '127.0.0.1',
        header: () => 'test',
      },
      session: {
        get: (key: string) => (key === 'current_project_id' ? 'project-1' : null),
        put() {},
        commit: () => Promise.resolve(),
      },
      response: {
        redirect: () => {
          throw new Error('Unexpected redirect')
        },
      },
      inertia: {
        render: (_page: string, props: Record<string, unknown>) => {
          renderedProps = props
          return { props }
        },
      },
    }

    await new ShowSprintReverseReviewBoardController(actions, workspaceAccess(true)).handle(ctx as never)

    assert.deepInclude(renderedProps, {
      reviewType: 'manager',
      targetType: 'assigner',
      selectedWorkflowId: 'workflow-1',
      workspaceMode: 'project',
    })
  })

  test('renders a personal environment review board from the selected project context', async ({
    assert,
  }) => {
    let renderedProps: Record<string, unknown> | null = null
    const actions = {
      makeGetSprintReverseReviewPageQuery() {
        return {
          executeAndWrap(input: { projectId: string; sprintId: string | null }) {
            assert.deepEqual(input, { projectId: 'project-1', sprintId: 'sprint-1' })
            return Promise.resolve(Result.ok({
              sprintId: 'sprint-1',
              reviewWindow: null,
              board: {
                assigner: emptySprintReverseReviewBoardSection(),
                environment: emptySprintReverseReviewBoardSection(),
              },
              project: { id: 'project-1', name: 'Project' },
            }))
          },
        }
      },
    } as unknown as ReviewActionFactory
    const ctx = {
      params: { projectId: 'project-1' },
      auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: (key: string) => (key === 'sprint_id' ? 'sprint-1' : undefined),
        url: () => '/reviews/environment',
        qs: () => ({ sprint_id: 'sprint-1' }),
        ip: () => '127.0.0.1',
        header: () => 'test',
      },
      session: {
        get: (key: string) => (key === 'current_project_id' ? 'project-1' : null),
        put() {},
        commit: () => Promise.resolve(),
      },
      response: {
        redirect: () => {
          throw new Error('Unexpected redirect')
        },
      },
      inertia: {
        render: (_page: string, props: Record<string, unknown>) => {
          renderedProps = props
          return { props }
        },
      },
    }

    await new ShowSprintReverseReviewBoardController(actions, workspaceAccess(true)).handle(ctx as never)

    assert.deepInclude(renderedProps, {
      reviewType: 'environment',
      targetType: 'environment',
      workspaceMode: 'project',
    })
  })

  test('moves a member from a project reverse-review URL to its personal board', async ({
    assert,
  }) => {
    let redirectTo: string | null = null
    const ctx = {
      params: { projectId: 'project-1' },
      auth: { user: { id: 'member-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: (key: string) => (key === 'workflow_id' ? 'workflow-1' : undefined),
        url: () => '/projects/project-1/reviews/environment',
      },
      response: { redirect: (path: string) => { redirectTo = path } },
      session: { get: () => null },
      inertia: { render: () => { throw new Error('Unexpected project workspace render') } },
    }
    const actions = {
      makeGetSprintReverseReviewPageQuery() {
        throw new Error('The project board query must not run for a personal-only member')
      },
    } as unknown as ReviewActionFactory

    await new ShowSprintReverseReviewBoardController(actions, workspaceAccess(false)).handle(ctx as never)

    assert.equal(redirectTo, '/reviews/environment?workflow_id=workflow-1')
  })
})

function workspaceAccess(canEnter: boolean): ProjectWorkspaceAccessReader {
  return {
    canEnter: () => Promise.resolve(canEnter),
    listEnterableByOrganization: () => Promise.resolve([]),
  }
}
