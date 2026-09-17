import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import EndProjectSprintDeliveryAndOpenReviewCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_and_open_review_command'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

const input = {
  project_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  sprint_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  incomplete_tasks: [],
}

test.group('End delivery and open review application intent', () => {
  test('does not open review when delivery fails', async ({ assert }) => {
    let reviewCalls = 0
    const contextMock: SprintActionContext = {
      userId: 'user-1',
      organizationId: 'org-1',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    }
    const deliveryMock = {
      executeAndWrap: () =>
        Promise.resolve(Result.fail(ValidationException.field('sprint_id', 'Invalid sprint'))),
    }
    const closureMock = {
      close: () => {
        reviewCalls += 1
        return Promise.resolve(Result.ok({}))
      },
    }
    const command = new EndProjectSprintDeliveryAndOpenReviewCommand(
      contextMock,
      deliveryMock as never,
      closureMock
    )

    const result = await command.executeAndWrap(input)

    assert.isTrue(result.isFailure())
    assert.equal(reviewCalls, 0)
  })

  test('returns the delivery and review result as one application output', async ({ assert }) => {
    const contextMock: SprintActionContext = {
      userId: 'user-1',
      organizationId: 'org-1',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
    }
    const deliveryMock = {
      executeAndWrap: () => Promise.resolve(Result.ok({ sprint: { id: input.sprint_id } })),
    }
    const closureMock = {
      close: () =>
        Promise.resolve(Result.ok({ sprint_id: input.sprint_id, status: 'review_open' })),
    }
    const command = new EndProjectSprintDeliveryAndOpenReviewCommand(
      contextMock,
      deliveryMock as never,
      closureMock
    )

    const result = await command.executeAndWrap(input)

    assert.deepEqual(result.getValue(), {
      sprint: { id: input.sprint_id },
      review: { sprint_id: input.sprint_id, status: 'review_open' },
    })
  })
})
