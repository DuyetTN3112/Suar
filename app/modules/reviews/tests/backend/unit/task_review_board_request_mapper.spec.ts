import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildTaskReviewBoardRequest } from '#modules/reviews/controllers/mappers/request/task-review/task_review_board_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    input(key: string) {
      return input[key]
    },
  } as never
}


test.group('', () => {
  test('prefers route project id and trims ids', ({ assert }) => {
    assert.deepEqual(
      buildTaskReviewBoardRequest(
        { projectId: ' route-project ' },
        fakeRequest({ project_id: 'query-project', task_id: ' task-1 ' }),
        ' session-project '
      ),
      {
        routeProjectId: 'route-project',
        projectId: 'route-project',
        requestedTaskId: 'task-1',
        workspaceMode: 'project',
      }
    )
  })

  test('falls back to query and session project ids when route is absent', ({ assert }) => {
    assert.deepEqual(buildTaskReviewBoardRequest({}, fakeRequest({ project_id: 'query-project' }), null), {
      routeProjectId: undefined,
      projectId: 'query-project',
      requestedTaskId: null,
      workspaceMode: 'personal',
    })

    assert.deepEqual(buildTaskReviewBoardRequest({}, fakeRequest({}), ' session-project '), {
      routeProjectId: undefined,
      projectId: 'session-project',
      requestedTaskId: null,
      workspaceMode: 'personal',
    })
  })

  test('returns null project id when all sources are absent', ({ assert }) => {
    assert.deepEqual(buildTaskReviewBoardRequest({}, fakeRequest({}), undefined), {
      routeProjectId: undefined,
      projectId: null,
      requestedTaskId: null,
      workspaceMode: 'personal',
    })
  })

  test('rejects wrong id types instead of coercing them', ({ assert }) => {
    assert.throws(() => buildTaskReviewBoardRequest({ projectId: 1 }, fakeRequest({}), undefined), ValidationException)
    assert.throws(() => buildTaskReviewBoardRequest({}, fakeRequest({ project_id: false }), undefined), ValidationException)
    assert.throws(() => buildTaskReviewBoardRequest({}, fakeRequest({ task_id: 42 }), undefined), ValidationException)
    assert.throws(() => buildTaskReviewBoardRequest({}, fakeRequest({}), { value: 'session' }), ValidationException)
  })


})
