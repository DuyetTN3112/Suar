import { test } from '@japa/runner'

import type { SprintBoardReader } from '#modules/sprints/actions/ports/outbound/sprint-board/sprint_board_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import GetSprintBoardQuery from '#modules/sprints/actions/queries/sprint-board/get_sprint_board_query'

const EXECUTION_CONTEXT = {
  userId: 'user-1',
  organizationId: 'org-1',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
}

const EXTERNAL_DEPENDENCIES: SprintExternalDependencies = {
  projectAccess: {
    resolveProjectSprintAccess: (_context, projectId) =>
      Promise.resolve({
        actorId: 'user-1',
        project: {
          id: projectId,
          organization_id: 'org-1',
          owner_id: 'user-1',
          manager_id: 'user-1',
          project_role: 'project_manager',
        },
        canManageSprint: true,
        isProjectParticipant: true,
      }),
  },
}

function makeBoardReader(): SprintBoardReader {
  return {
    findSprint: (_projectId, sprintId) =>
      Promise.resolve({
        id: sprintId ?? 'active-sprint',
        name: 'Active sprint',
        goal: null,
        status: 'active',
        starts_at: '2026-07-20T00:00:00.000Z',
        ends_at: '2026-08-03T00:00:00.000Z',
      }),
    listTasks: (_projectId, sprintId) =>
      Promise.resolve([
        {
          id: sprintId ? 'sprint-task' : 'backlog-task',
          title: sprintId ? 'Sprint task' : 'Backlog task',
          task_status_id: null,
          status: 'open',
          priority: 'medium',
          assigned_to: null,
          project_sprint_id: sprintId,
          sort_order: 0,
          updated_at: '2026-07-23T00:00:00.000Z',
        },
      ]),
  }
}

test.group('Get sprint board query', () => {
  test('orchestrates access, sprint selection, and task windows', async ({ assert }) => {
    const query = new GetSprintBoardQuery(
      EXECUTION_CONTEXT,
      EXTERNAL_DEPENDENCIES,
      makeBoardReader()
    )

    const result = await query.handle({ project_id: 'project-1' })

    assert.equal(result.sprint?.id, 'active-sprint')
    assert.deepEqual(
      result.backlog_tasks.map((task) => task.id),
      ['backlog-task']
    )
    assert.deepEqual(
      result.sprint_tasks.map((task) => task.id),
      ['sprint-task']
    )
    assert.deepEqual(result.counts, {
      backlog_tasks: 1,
      sprint_tasks: 1,
    })
  })

  test('builds a backlog-only board when sprint selection is explicitly disabled', async ({
    assert,
  }) => {
    let sprintLookupCount = 0
    const boardReader = makeBoardReader()
    boardReader.findSprint = () => {
      sprintLookupCount += 1
      return Promise.resolve(null)
    }
    const query = new GetSprintBoardQuery(EXECUTION_CONTEXT, EXTERNAL_DEPENDENCIES, boardReader)

    const result = await query.handle({
      project_id: 'project-1',
      project_sprint_id: null,
    })

    assert.equal(sprintLookupCount, 0)
    assert.isNull(result.sprint)
    assert.lengthOf(result.backlog_tasks, 1)
    assert.lengthOf(result.sprint_tasks, 0)
    assert.deepEqual(result.counts, {
      backlog_tasks: 1,
      sprint_tasks: 0,
    })
  })

  test('exposes the query result through the local Result boundary', async ({ assert }) => {
    const query = new GetSprintBoardQuery(
      EXECUTION_CONTEXT,
      EXTERNAL_DEPENDENCIES,
      makeBoardReader()
    )

    const outcome = await query.executeAndWrap({ project_id: 'project-1' })

    assert.isTrue(outcome.isSuccess())
    assert.equal(outcome.getValue().project_id, 'project-1')
  })
})
