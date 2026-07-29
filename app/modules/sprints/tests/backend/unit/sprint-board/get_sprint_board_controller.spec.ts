import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import GetSprintBoardController from '#modules/sprints/controllers/sprint-board/get_sprint_board_controller'

test.group('Unit | Get sprint board controller', () => {
  test('passes validated route and sprint ids to the board query', async ({ assert }) => {
    let capturedInput: Record<string, unknown> | null = null
    const queries = {
      makeBoard() {
        return {
          executeAndWrap(input: Record<string, unknown>) {
            capturedInput = input
            return Promise.resolve(
              Result.ok({
                project_id: 'project-1',
                sprint: null,
                backlog_tasks: [],
                sprint_tasks: [],
                counts: { backlog_tasks: 0, sprint_tasks: 0 },
              })
            )
          },
        }
      },
    } as unknown as SprintQueryFactory
    const ctx = {
      params: { projectId: ' project-1 ' },
      auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input(key: string) {
          return key === 'project_sprint_id' ? ' sprint-1 ' : undefined
        },
        ip() {
          return '127.0.0.1'
        },
        header() {
          return 'test'
        },
      },
    }

    const result = await new GetSprintBoardController(queries).handle(ctx as never)

    assert.deepEqual(capturedInput, {
      project_id: 'project-1',
      project_sprint_id: 'sprint-1',
    })
    assert.deepEqual(result, {
      data: {
        projectId: 'project-1',
        sprint: null,
        backlogTasks: [],
        sprintTasks: [],
        counts: { backlogTasks: 0, sprintTasks: 0 },
      },
    })
  })

  test('rejects wrong sprint id types before invoking the board query', async ({ assert }) => {
    let makeBoardCalled = false
    const queries = {
      makeBoard() {
        makeBoardCalled = true
        return {
          executeAndWrap() {
            throw new Error('Unexpected query execution')
          },
        }
      },
    } as unknown as SprintQueryFactory
    const ctx = {
      params: { projectId: 'project-1' },
      auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input(key: string) {
          return key === 'projectSprintId' ? 42 : undefined
        },
        ip() {
          return '127.0.0.1'
        },
        header() {
          return 'test'
        },
      },
    }

    await assert.rejects(
      () => new GetSprintBoardController(queries).handle(ctx as never),
      ValidationException
    )
    assert.isFalse(makeBoardCalled)
  })
})
