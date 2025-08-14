import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'
import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

function validCreatePayload() {
  return {
    title: 'Implement review flow',
    task_status_id: VALID_UUID_3,
    project_id: VALID_UUID_2,
    organization_id: VALID_UUID,
    acceptance_criteria: 'Flow works end-to-end and passes verification',
    required_skills: [{ id: VALID_UUID_3, level: 'middle' }],
  }
}

test.group('Task DTO contracts', () => {
  test('CreateTaskDTO normalizes canonical creation payloads and exposes task helpers', ({
    assert,
  }) => {
    const dto = new CreateTaskDTO({
      ...validCreatePayload(),
      title: '  Implement review flow  ',
      description: '  Tighten review pipeline  ',
      label: 'feature',
      priority: 'high',
      task_type: 'code_review',
      verification_method: 'peer_review',
      tech_stack: ['adonis', 'svelte'],
      learning_objectives: ['test quality'],
      domain_tags: ['review'],
    })

    assert.equal(dto.title, 'Implement review flow')
    assert.equal(dto.description, 'Tighten review pipeline')
    assert.equal(dto.task_status_id, VALID_UUID_3)
    assert.equal(dto.task_type, 'code_review')
    assert.equal(dto.verification_method, 'peer_review')
    assert.deepEqual(dto.required_skills, [{ id: VALID_UUID_3, level: 'middle' }])
    assert.deepEqual(dto.toObject()['learning_objectives'], ['test quality'])
    const helperDto = new CreateTaskDTO({
      ...validCreatePayload(),
      assigned_to: VALID_UUID_2,
      due_date: DateTime.now().plus({ days: 7 }),
      parent_task_id: VALID_UUID,
      project_id: VALID_UUID_3,
      estimated_time: 8,
    })

    assert.isTrue(helperDto.isAssigned())
    assert.isTrue(helperDto.hasDueDate())
    assert.isTrue(helperDto.isSubtask())
    assert.isTrue(helperDto.belongsToProject())
    assert.isTrue(helperDto.hasEstimatedTime())
    assert.isFalse(helperDto.isOverdue())
    assert.isAbove(helperDto.getDaysUntilDue() ?? 0, 0)
  })

  test('CreateTaskDTO rejects invalid workflow metadata and required skill shapes', ({
    assert,
  }) => {
    const invalidFactories = [
      () => new CreateTaskDTO({ ...validCreatePayload(), title: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), task_status_id: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), label: 'invalid_label' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), priority: 'invalid_priority' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), project_id: '' as never }),
      () => new CreateTaskDTO({ ...validCreatePayload(), acceptance_criteria: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), required_skills: [] }),
      () =>
        new CreateTaskDTO({
          ...validCreatePayload(),
          required_skills: [
            { id: VALID_UUID_2, level: 'middle' },
            { id: VALID_UUID_2, level: 'senior' },
          ],
        }),
      () => new CreateTaskDTO({ ...validCreatePayload(), verification_method: 'invalid_method' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), estimated_users_affected: -1 }),
    ]

    for (const factory of invalidFactories) {
      assert.throws(factory)
    }
  })

  test('UpdateTaskDTO and GetTasksListDTO preserve canonical partial-update and filter contracts', ({
    assert,
  }) => {
    const dueDate = DateTime.fromISO('2026-04-10')
    const dto = new UpdateTaskDTO({
      title: '  Updated task  ',
      assigned_to: null,
      due_date: dueDate,
      project_id: VALID_UUID_3,
      estimated_time: 5,
      updated_by: VALID_UUID,
    })

    assert.isTrue(dto.hasUpdates())
    assert.deepEqual(
      dto.getUpdatedFields().sort(),
      ['assigned_to', 'due_date', 'estimated_time', 'project_id', 'title'].sort()
    )
    assert.isTrue(dto.hasAssigneeChange())
    assert.isTrue(dto.isUnassigning())
    assert.isTrue(dto.hasDueDateChange())
    assert.isTrue(dto.hasProjectChange())
    assert.include(dto.getAuditMessage(), 'bỏ giao việc')

    const object = dto.toObject()
    assert.equal(object.title, 'Updated task')
    assert.isNull(object.assigned_to)
    assert.equal(object.updated_by, VALID_UUID)

    const changes = dto.getChangesForAudit({
      title: 'Old task',
      assigned_to: VALID_UUID_2,
      due_date: null,
      project_id: VALID_UUID_2,
      estimated_time: 1,
    })
    assert.lengthOf(changes, 5)

    const invalidUpdateFactories = [
      () => new UpdateTaskDTO({ title: '' }),
      () => new UpdateTaskDTO({ title: 'AB' }),
      () => new UpdateTaskDTO({ label: 'invalid_label' }),
      () => new UpdateTaskDTO({ priority: 'invalid_priority' }),
      () => new UpdateTaskDTO({ assigned_to: '' }),
      () => new UpdateTaskDTO({ project_id: '' }),
      () => new UpdateTaskDTO({ estimated_time: -1 }),
      () => new UpdateTaskDTO({ due_date: 'not-a-date' }),
      () => new UpdateTaskDTO({ updated_by: '' }),
    ]

    for (const factory of invalidUpdateFactories) {
      assert.throws(factory)
    }
    const listDto = new GetTasksListDTO({
      page: 2,
      limit: 20,
      status: VALID_UUID_3,
      assigned_to: VALID_UUID_2,
      parent_task_id: null,
      project_id: VALID_UUID_2,
      search: ' review quality ',
      organization_id: VALID_UUID,
      sort_by: 'title',
      sort_order: 'desc',
    })

    assert.equal(listDto.task_status_id, VALID_UUID_3)
    assert.isTrue(listDto.hasFilters())
    assert.isTrue(listDto.hasStatusFilter())
    assert.isTrue(listDto.hasAssigneeFilter())
    assert.isTrue(listDto.hasParentFilter())
    assert.isTrue(listDto.hasProjectFilter())
    assert.isTrue(listDto.isRootTasksOnly())
    assert.equal(listDto.search, 'review quality')
    assert.equal(listDto.getOffset(), 20)
    assert.include(listDto.getCacheKey(), `task_status_id:${VALID_UUID_3}`)
    assert.include(listDto.getCacheKey(), 'sort:title:desc')
    assert.include(listDto.getFiltersSummary(), `Project: ${VALID_UUID_2}`)
  })
})
