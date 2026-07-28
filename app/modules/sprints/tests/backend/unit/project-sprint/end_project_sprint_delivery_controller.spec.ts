import { test } from '@japa/runner'

import type { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import type { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'
import EndProjectSprintDeliveryController from '#modules/sprints/controllers/project-sprint/end_project_sprint_delivery_controller'

test.group('End project sprint delivery controller', () => {
  test('delegates the delivery-to-review workflow to one application intent', async ({ assert }) => {
    const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    const sprintId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
    const calls: string[] = []
    const commands = {
      makeEndDeliveryAndOpenReview: () => ({
        executeAndWrap: () => Promise.resolve({
          getValue: () => {
            calls.push('delivery-to-review')
            return {
              sprint: { id: sprintId, status: 'active' },
              review: { sprint_id: sprintId, status: 'review_open' },
            }
          },
        }),
      }),
    } as unknown as SprintCommandFactory
    const reviews = {
      close: () => Promise.resolve({
        getValue: () => {
          calls.push('open-review')
          return { sprint_id: sprintId, status: 'review_open' }
        },
      }),
    } as unknown as SprintReviewClosure
    const ctx = {
      params: { projectId, sprintId },
      request: {
        body: () => ({ incompleteTasks: [] }),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      auth: { user: { id: 'user-1' } },
      session: { get: () => null },
      currentOrganizationId: 'org-1',
      currentOrganizationRole: 'project_manager',
    }

    const commandFactory = { ...commands, reviewClosure: reviews } as unknown as SprintCommandFactory
    const result = await new EndProjectSprintDeliveryController(commandFactory).handle(ctx as never)

    assert.deepEqual(calls, ['delivery-to-review'])
    assert.equal((result.data.review as { status: string }).status, 'review_open')
  })
})
