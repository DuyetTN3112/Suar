import { test } from '@japa/runner'

import {
  sprintCommandFactory,
  sprintQueryFactory,
} from '#composition/sprint_application_composition'
import { mapSprintListApiBody } from '#modules/sprints/controllers/mappers/sprint_response_mapper'

test.group('Sprint module contracts', () => {
  test('application factories expose sprint actions without module bootstrap', ({ assert }) => {
    const ctx = {
      userId: 'user-1',
      organizationId: 'org-1',
      ip: '127.0.0.1',
      userAgent: 'sprint-module-contract-test',
    }

    assert.equal(typeof sprintCommandFactory.makeMoveTask(ctx).execute, 'function')
    assert.equal(typeof sprintCommandFactory.makeCreate(ctx).execute, 'function')
    assert.equal(typeof sprintCommandFactory.makeUpdate(ctx).execute, 'function')
    assert.equal(typeof sprintQueryFactory.makeBoard(ctx).handle, 'function')
    assert.equal(typeof sprintQueryFactory.makeList(ctx).handle, 'function')
    assert.equal(typeof sprintQueryFactory.makeDetail(ctx).handle, 'function')
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
