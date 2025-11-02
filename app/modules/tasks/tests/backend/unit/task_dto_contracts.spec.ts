import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import {
  ApplyForTaskDTO,
  GetPublicTasksDTO,
  GetTaskApplicationsDTO,
  ProcessApplicationDTO,
  WithdrawApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'

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
    required_skills: [{ id: VALID_UUID_3, level: 'l7' }],
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
      verification_method: 'peer_review\ncustom:Pair walkthrough with PM',
      tech_stack: ['adonis', 'svelte'],
      learning_objectives: ['test quality'],
      domain_tags: ['review'],
    })

    assert.equal(dto.title, 'Implement review flow')
    assert.equal(dto.description, 'Tighten review pipeline')
    assert.equal(dto.task_status_id, VALID_UUID_3)
    assert.equal(dto.task_type, 'code_review')
    assert.equal(dto.verification_method, 'peer_review\ncustom:Pair walkthrough with PM')
    assert.equal(dto.required_skills[0]?.id, VALID_UUID_3)
    assert.equal(dto.required_skills[0]?.level, 'l7')
    assert.deepEqual(dto.toObject()['learning_objectives'], ['test quality'])
    const helperDto = new CreateTaskDTO({
      ...validCreatePayload(),
      assigned_to: VALID_UUID_2,
      due_date: DateTime.now().plus({ days: 7 }),
      parent_task_id: VALID_UUID,
      project_id: VALID_UUID_3,
      project_sprint_id: VALID_UUID,
      estimated_time: 8,
    })

    assert.isTrue(helperDto.isAssigned())
    assert.isTrue(helperDto.hasDueDate())
    assert.isTrue(helperDto.isSubtask())
    assert.isTrue(helperDto.belongsToProject())
    assert.equal(helperDto.project_sprint_id, VALID_UUID)
    assert.equal(helperDto.toObject()['project_sprint_id'], VALID_UUID)
    assert.isTrue(helperDto.hasEstimatedTime())
    assert.isFalse(helperDto.isOverdue())
    assert.isAbove(helperDto.getDaysUntilDue() ?? 0, 0)

    const fromCoreDto = CreateTaskDTO.fromCore({
      title: 'Factory task',
      task_status_id: VALID_UUID_3,
      project_id: VALID_UUID_2,
      organization_id: VALID_UUID,
      required_skills: [{ id: VALID_UUID_3, level: 'l7' }],
    })
    assert.equal(fromCoreDto.acceptance_criteria, 'Task completion is verified')

    const subtaskDto = CreateTaskDTO.forSubtask(
      {
        title: 'Factory subtask',
        task_status_id: VALID_UUID_3,
        project_id: VALID_UUID_2,
        organization_id: VALID_UUID,
        required_skills: [{ id: VALID_UUID_3, level: 'l7' }],
        parent_task_id: VALID_UUID,
      },
      {
        acceptance_criteria: 'Subtask accepted by reviewer',
      }
    )
    assert.isTrue(subtaskDto.isSubtask())
    assert.equal(subtaskDto.acceptance_criteria, 'Subtask accepted by reviewer')
  })

  test('CreateTaskDTO rejects invalid workflow metadata and required skill shapes', ({
    assert,
  }) => {
    const invalidFactories = [
      () => new CreateTaskDTO({ ...validCreatePayload(), title: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), description: 'D'.repeat(5001) }),
      () => new CreateTaskDTO({ ...validCreatePayload(), task_status_id: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), label: 'invalid_label' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), priority: 'invalid_priority' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), project_id: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), acceptance_criteria: '' }),
      () => new CreateTaskDTO({ ...validCreatePayload(), required_skills: [] }),
      () =>
        new CreateTaskDTO({
          ...validCreatePayload(),
          required_skills: [
            { id: VALID_UUID_2, level: 'l7' },
            { id: VALID_UUID_2, level: 'l10' },
          ],
        }),
      () => new CreateTaskDTO({ ...validCreatePayload(), required_skills: [{ id: VALID_UUID_3, level: 'middle' }] }),
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
      project_sprint_id: VALID_UUID_2,
      estimated_time: 5,
      updated_by: VALID_UUID,
    })

    assert.isTrue(dto.hasUpdates())
    assert.deepEqual(
      dto.getUpdatedFields().sort(),
      ['assigned_to', 'due_date', 'estimated_time', 'project_id', 'project_sprint_id', 'title'].sort()
    )
    assert.include(dto.getUpdatedFields(), 'project_sprint_id')
    assert.isTrue(dto.hasAssigneeChange())
    assert.isTrue(dto.isUnassigning())
    assert.isTrue(dto.hasDueDateChange())
    assert.isTrue(dto.hasProjectChange())
    assert.include(dto.getAuditMessage(), 'bỏ giao việc')

    const object = dto.toObject()
    assert.equal(object['title'], 'Updated task')
    assert.isNull(object['assigned_to'])
    assert.equal(object['project_sprint_id'], VALID_UUID_2)
    assert.equal(object['updated_by'], VALID_UUID)

    const changes = dto.getChangesForAudit({
      title: 'Old task',
      assigned_to: VALID_UUID_2,
      due_date: null,
      project_id: VALID_UUID_2,
      project_sprint_id: null,
      estimated_time: 1,
    })
    assert.lengthOf(changes, 6)

    const invalidUpdateFactories = [
      () => new UpdateTaskDTO({ title: '' }),
      () => new UpdateTaskDTO({ title: 'AB' }),
      () => new UpdateTaskDTO({ label: 'invalid_label' }),
      () => new UpdateTaskDTO({ priority: 'invalid_priority' }),
      () => new UpdateTaskDTO({ task_type: 'bug_fixing' }),
      () => new UpdateTaskDTO({ assigned_to: '' }),
      () => new UpdateTaskDTO({ project_id: '' }),
      () => new UpdateTaskDTO({ project_sprint_id: '' }),
      () => new UpdateTaskDTO({ estimated_time: -1 }),
      () => new UpdateTaskDTO({ due_date: 'not-a-date' }),
      () => new UpdateTaskDTO({ updated_by: '' }),
    ]

    for (const factory of invalidUpdateFactories) {
      assert.throws(factory)
    }

    const factoryDto = UpdateTaskDTO.fromValidatedPayload(
      {
        title: '  Factory updated task  ',
        project_id: VALID_UUID_2,
      },
      VALID_UUID
    )
    assert.equal(factoryDto.title, 'Factory updated task')
    assert.equal(factoryDto.updated_by, VALID_UUID)
    assert.deepEqual(factoryDto.getUpdatedFields().sort(), ['project_id', 'title'].sort())

    const partialFactoryDto = UpdateTaskDTO.fromPartialUpdate({
      due_date: null,
      updated_by: VALID_UUID,
    })
    assert.isTrue(partialFactoryDto.hasDueDateChange())
    assert.isTrue(partialFactoryDto.isRemovingDueDate())

    const listDto = new GetTasksListDTO({
      page: 2,
      limit: 20,
      task_status_id: [VALID_UUID_3],
      assigned_to: [VALID_UUID_2],
      parent_task_id: null,
      project_id: VALID_UUID_2,
      project_sprint_id: VALID_UUID_3,
      search: ' review quality ',
      organization_id: VALID_UUID,
      sort_by: 'title',
      sort_order: 'desc',
    })

    assert.deepEqual(listDto.task_status_id, [VALID_UUID_3])
    assert.isTrue(listDto.hasFilters())
    assert.isTrue(listDto.hasStatusFilter())
    assert.isTrue(listDto.hasAssigneeFilter())
    assert.isTrue(listDto.hasParentFilter())
    assert.isTrue(listDto.hasProjectFilter())
    assert.isTrue(listDto.hasProjectSprintFilter())
    assert.isTrue(listDto.isRootTasksOnly())
    assert.equal(listDto.project_sprint_id, VALID_UUID_3)
    assert.equal(listDto.search, 'review quality')
    assert.equal(listDto.getOffset(), 20)
    assert.include(listDto.getCacheKey(), `task_status_id:${VALID_UUID_3}`)
    assert.include(listDto.getCacheKey(), `project_sprint:${VALID_UUID_3}`)
    assert.include(listDto.getCacheKey(), 'sort:title:desc')
    assert.include(listDto.getFiltersSummary(), `Project: ${VALID_UUID_2}`)
    assert.include(listDto.getFiltersSummary(), `Sprint: ${VALID_UUID_3}`)

    const backlogDto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      project_sprint_id: null,
    })
    assert.isTrue(backlogDto.hasProjectSprintFilter())
    assert.isTrue(backlogDto.isProjectBacklogOnly())
    assert.include(backlogDto.getCacheKey(), 'project_sprint:backlog')
    assert.include(backlogDto.getFiltersSummary(), 'Sprint backlog')

    const queryStringPaginationDto = new GetTasksListDTO({
      organization_id: VALID_UUID,
      page: '2' as never,
      limit: '15' as never,
    })
    assert.strictEqual(queryStringPaginationDto.page, 2)
    assert.strictEqual(queryStringPaginationDto.limit, 15)
    assert.strictEqual(queryStringPaginationDto.getOffset(), 15)
  })

  test('Task application request DTO factories preserve canonical mapping contracts', ({
    assert,
  }) => {
    const applyDto = ApplyForTaskDTO.fromValidatedPayload(
      {
        message: 'I can help with this task',
        portfolio_links: ['https://example.com/portfolio'],
        application_source: 'public_listing',
      },
      VALID_UUID
    )
    assert.equal(applyDto.task_id, VALID_UUID)
    assert.deepEqual(applyDto.portfolio_links, ['https://example.com/portfolio'])

    const processDto = ProcessApplicationDTO.fromValidatedPayload(
      {
        action: 'approve',
        rejection_reason: null,
        assignment_type: 'external_contributor',
        estimated_hours: 12,
      },
      VALID_UUID_2
    )
    assert.equal(processDto.application_id, VALID_UUID_2)
    assert.equal(processDto.action, 'approve')
    assert.equal(processDto.estimated_hours, 12)

    const withdrawDto = WithdrawApplicationDTO.fromApplicationId(VALID_UUID_3)
    assert.equal(withdrawDto.application_id, VALID_UUID_3)

    const taskApplicationsDto = GetTaskApplicationsDTO.forTask(VALID_UUID, {
      status: 'all',
      page: 2,
      per_page: 25,
    })
    assert.equal(taskApplicationsDto.task_id, VALID_UUID)
    assert.equal(taskApplicationsDto.page, 2)
    assert.equal(taskApplicationsDto.per_page, 25)

    const publicTasksDto = GetPublicTasksDTO.fromFilters({
      keyword: '  quality review ',
      task_ids: [VALID_UUID, '', VALID_UUID_2],
      sort_by: 'due_date',
      sort_order: 'asc',
    })
    assert.equal(publicTasksDto.keyword, 'quality review')
    assert.deepEqual(publicTasksDto.task_ids, [VALID_UUID, VALID_UUID_2])
    assert.equal(publicTasksDto.sort_by, 'due_date')
    assert.equal(publicTasksDto.sort_order, 'asc')
  })
})
