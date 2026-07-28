/* eslint-disable @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unnecessary-type-assertion */
import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import EndProjectSprintDeliveryAndOpenReviewCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_and_open_review_command'

const input = {
  project_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  sprint_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  incomplete_tasks: [],
}

test.group('End delivery and open review application intent', () => {
  test('does not open review when delivery fails', async ({ assert }) => {
    let reviewCalls = 0
    const command = new EndProjectSprintDeliveryAndOpenReviewCommand(
      {} as never,
      { executeAndWrap: () => Promise.resolve(Result.fail(ValidationException.field('sprint_id', 'Invalid sprint'))) } as never,
      { close: () => { reviewCalls += 1; return Promise.resolve(Result.ok({})) } } as never
    )

    const result = await command.executeAndWrap(input)

    assert.isTrue(result.isFailure())
    assert.equal(reviewCalls, 0)
  })

  test('returns the delivery and review result as one application output', async ({ assert }) => {
    const command = new EndProjectSprintDeliveryAndOpenReviewCommand(
      {} as never,
      { executeAndWrap: () => Promise.resolve(Result.ok({ sprint: { id: input.sprint_id } })) } as never,
      { close: () => Promise.resolve(Result.ok({ sprint_id: input.sprint_id, status: 'review_open' })) } as never
    )

    const result = await command.executeAndWrap(input)

    assert.deepEqual(result.getValue(), {
      sprint: { id: input.sprint_id },
      review: { sprint_id: input.sprint_id, status: 'review_open' },
    })
  })
})
