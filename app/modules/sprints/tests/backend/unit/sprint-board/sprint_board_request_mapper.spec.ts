import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildSprintBoardRequest } from '#modules/sprints/controllers/mappers/request/sprint-board/sprint_board_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  return {
    input(key: string) {
      return input[key]
    },
  } as never
}

test.group('Unit | Sprint board request mapper', () => {
  test('maps route project id and sprint aliases into canonical DTO fields', ({ assert }) => {
    assert.deepEqual(
      buildSprintBoardRequest({ projectId: ' project-1 ' }, fakeRequest({ project_sprint_id: ' sprint-1 ' })),
      {
        project_id: 'project-1',
        project_sprint_id: 'sprint-1',
      }
    )

    assert.deepEqual(buildSprintBoardRequest({ projectId: 'project-1' }, fakeRequest({})), {
      project_id: 'project-1',
    })
  })

  test('rejects conflicting sprint aliases and wrong id types', ({ assert }) => {
    assert.throws(
      () =>
        buildSprintBoardRequest(
          { projectId: 'project-1' },
          fakeRequest({ projectSprintId: 'sprint-1', project_sprint_id: 'sprint-2' })
        ),
      ValidationException
    )

    assert.throws(() => buildSprintBoardRequest({ projectId: 1 }, fakeRequest({})), ValidationException)
    assert.throws(
      () => buildSprintBoardRequest({ projectId: 'project-1' }, fakeRequest({ projectSprintId: 42 })),
      ValidationException
    )
  })
})
