import { test } from '@japa/runner'

import {
  makeCreateProjectSprintCommand,
  makeMoveTaskToSprintCommand,
  makeUpdateProjectSprintCommand,
} from '#modules/sprints/bootstrap/sprint_action_factory'
import {
  makeGetProjectSprintQuery,
  makeGetSprintBoardQuery,
  makeListProjectSprintsQuery,
} from '#modules/sprints/bootstrap/sprint_query_factory'
import { mapSprintListApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'
import { SprintPublicApi, sprintPublicApi } from '#modules/sprints/public_contracts/sprint_public_api'

test.group('Sprint module contracts', () => {
  test('bootstrap factories expose sprint application actions', ({ assert }) => {
    const ctx = {
      userId: 'user-1',
      organizationId: 'org-1',
      ip: '127.0.0.1',
      userAgent: 'sprint-module-contract-test',
    }

    assert.equal(typeof makeMoveTaskToSprintCommand(ctx).execute, 'function')
    assert.equal(typeof makeCreateProjectSprintCommand(ctx).execute, 'function')
    assert.equal(typeof makeUpdateProjectSprintCommand(ctx).execute, 'function')
    assert.equal(typeof makeGetSprintBoardQuery(ctx).handle, 'function')
    assert.equal(typeof makeListProjectSprintsQuery(ctx).handle, 'function')
    assert.equal(typeof makeGetProjectSprintQuery(ctx).handle, 'function')
  })

  test('public contract exports stable sprint API singleton and class', ({ assert }) => {
    assert.instanceOf(sprintPublicApi, SprintPublicApi)
    assert.equal(typeof sprintPublicApi.createProjectSprint, 'function')
    assert.equal(typeof sprintPublicApi.listProjectSprints, 'function')
    assert.equal(typeof sprintPublicApi.getProjectSprint, 'function')
    assert.equal(typeof sprintPublicApi.updateProjectSprint, 'function')
    assert.equal(typeof sprintPublicApi.getSprintBoard, 'function')
    assert.equal(typeof sprintPublicApi.moveTaskToSprint, 'function')
  })

  test('response mapper camelizes keys without erasing Date values', ({ assert }) => {
    const startsAt = new Date('2026-07-16T08:00:00.000Z')
    const body = mapSprintListApiBody({
      data: [
        {
          id: 'sprint-1',
          starts_at: startsAt,
          nested_value: { ends_at: startsAt },
        },
      ],
      pagination: { page: 1 },
    }) as {
      data: Array<{ startsAt: string; nestedValue: { endsAt: string } }>
    }

    assert.equal(body.data[0]?.startsAt, startsAt.toISOString())
    assert.equal(body.data[0]?.nestedValue.endsAt, startsAt.toISOString())
  })
})
