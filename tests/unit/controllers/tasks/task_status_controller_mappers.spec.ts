import { test } from '@japa/runner'
import {
  buildCreateTaskStatusDTO,
  buildDeleteTaskStatusDTO,
  buildOrganizationWorkflowCreateTaskStatusDTO,
  buildUpdateTaskStatusDefinitionDTO,
  buildUpdateWorkflowDTO,
  buildWithdrawApplicationDTO,
} from '#controllers/tasks/mapper/request/task_status_request_mapper'
import {
  mapTaskStatusDeleteApiBody,
  mapTaskStatusMutationApiBody,
  mapWorkflowUpdateApiBody,
} from '#controllers/tasks/mapper/response/task_status_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Task status controller mappers', () => {
  test('task status request mappers normalize create/update/delete/workflow inputs', ({
    assert,
  }) => {
    const createDto = buildCreateTaskStatusDTO(
      fakeRequest({
        name: 'In Review',
        slug: 'in_review',
        category: 'in_progress',
        color: '#123456',
        icon: 'search',
        description: '  review state  ',
        sort_order: '3',
      }) as never,
      'org-1'
    )
    assert.equal(createDto.organization_id, 'org-1')
    assert.equal(createDto.slug, 'in_review')
    assert.equal(createDto.sort_order, 3)
    assert.equal(createDto.description, 'review state')

    const workflowCreateDto = buildOrganizationWorkflowCreateTaskStatusDTO(
      fakeRequest({
        name: 'QA Review',
      }) as never,
      'org-1'
    )
    assert.equal(workflowCreateDto.slug, 'qa_review')
    assert.equal(workflowCreateDto.category, 'in_progress')
    assert.equal(workflowCreateDto.color, '#6B7280')

    const updateDto = buildUpdateTaskStatusDefinitionDTO(
      fakeRequest({
        name: 'Done',
        icon: null,
        description: null,
        is_default: 'true',
      }) as never,
      'org-1',
      'status-1'
    )
    assert.equal(updateDto.status_id, 'status-1')
    assert.equal(updateDto.organization_id, 'org-1')
    assert.equal(updateDto.icon, null)
    assert.equal(updateDto.description, null)
    assert.isTrue(updateDto.is_default)

    const deleteDto = buildDeleteTaskStatusDTO('org-1', 'status-1')
    assert.equal(deleteDto.organization_id, 'org-1')
    assert.equal(deleteDto.status_id, 'status-1')

    const workflowDto = buildUpdateWorkflowDTO(
      fakeRequest({
        transitions: [{ from_status_id: 'todo', to_status_id: 'doing' }],
      }) as never,
      'org-1'
    )
    assert.equal(workflowDto.organization_id, 'org-1')
    assert.deepEqual(workflowDto.transitions, [
      { from_status_id: 'todo', to_status_id: 'doing', conditions: {} },
    ])

    const withdrawDto = buildWithdrawApplicationDTO('app-1')
    assert.equal(withdrawDto.application_id, 'app-1')
  })

  test('task status response mappers keep success envelopes stable', ({ assert }) => {
    assert.deepEqual(mapTaskStatusMutationApiBody(serializable({ id: 'status-1' })), {
      success: true,
      data: { id: 'status-1' },
    })
    assert.deepEqual(mapTaskStatusDeleteApiBody(), { success: true })
    assert.deepEqual(mapWorkflowUpdateApiBody([{ id: 'transition-1' }]), {
      success: true,
      data: [{ id: 'transition-1' }],
    })
  })
})
