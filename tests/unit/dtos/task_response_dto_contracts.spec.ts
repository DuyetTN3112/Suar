import { test } from '@japa/runner'

import {
  TaskDetailResponseDTO,
  TaskListItemResponseDTO,
  TaskSummaryResponseDTO,
} from '#actions/tasks/dtos/response/task_response_dtos'
import { TaskEntity } from '#modules/tasks/domain/entities/task_entity'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function makeTaskEntity(): TaskEntity {
  const now = new Date('2026-04-10T12:00:00.000Z')

  return new TaskEntity({
    id: VALID_UUID,
    title: 'Refactor task response DTOs',
    description: 'Keep response factories small and explicit',
    status: 'in_progress',
    taskStatusId: VALID_UUID_2,
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    assignedTo: VALID_UUID_2,
    creatorId: VALID_UUID,
    updatedBy: VALID_UUID_2,
    dueDate: new Date('2026-04-18T00:00:00.000Z'),
    parentTaskId: null,
    estimatedTime: 8,
    actualTime: 5,
    organizationId: VALID_UUID_2,
    projectId: VALID_UUID,
    taskVisibility: 'external',
    applicationDeadline: new Date('2026-04-17T00:00:00.000Z'),
    estimatedBudget: 750000,
    externalApplicationsCount: 3,
    sortOrder: 12,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  })
}

test.group('Task response DTO contracts', () => {
  test('fromProps factories preserve the public response shape exactly', ({ assert }) => {
    const detailProps = {
      id: VALID_UUID,
      title: 'Detailed task',
      description: 'Detailed description',
      status: 'done',
      taskStatusId: null,
      label: 'documentation',
      priority: 'medium',
      difficulty: null,
      assignedTo: null,
      creatorId: VALID_UUID_2,
      updatedBy: null,
      dueDate: null,
      parentTaskId: null,
      estimatedTime: 0,
      actualTime: 0,
      organizationId: VALID_UUID,
      projectId: null,
      taskVisibility: 'internal',
      applicationDeadline: null,
      estimatedBudget: null,
      externalApplicationsCount: 0,
      sortOrder: 1,
      createdAt: new Date('2026-04-10T00:00:00.000Z'),
      updatedAt: new Date('2026-04-11T00:00:00.000Z'),
    }

    const listProps = {
      id: VALID_UUID,
      title: 'List task',
      status: 'todo',
      label: 'feature',
      priority: 'high',
      difficulty: 'medium',
      assignedTo: VALID_UUID_2,
      dueDate: null,
      organizationId: VALID_UUID,
      projectId: VALID_UUID_2,
      sortOrder: 2,
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
    }

    const summaryProps = {
      id: VALID_UUID_2,
      title: 'Summary task',
      status: 'in_review',
      priority: 'urgent',
    }

    const detail = TaskDetailResponseDTO.fromProps(detailProps)
    const listItem = TaskListItemResponseDTO.fromProps(listProps)
    const summary = TaskSummaryResponseDTO.fromProps(summaryProps)

    assert.deepEqual(
      {
        id: detail.id,
        title: detail.title,
        description: detail.description,
        status: detail.status,
        taskStatusId: detail.taskStatusId,
        label: detail.label,
        priority: detail.priority,
        difficulty: detail.difficulty,
        assignedTo: detail.assignedTo,
        creatorId: detail.creatorId,
        updatedBy: detail.updatedBy,
        dueDate: detail.dueDate,
        parentTaskId: detail.parentTaskId,
        estimatedTime: detail.estimatedTime,
        actualTime: detail.actualTime,
        organizationId: detail.organizationId,
        projectId: detail.projectId,
        taskVisibility: detail.taskVisibility,
        applicationDeadline: detail.applicationDeadline,
        estimatedBudget: detail.estimatedBudget,
        externalApplicationsCount: detail.externalApplicationsCount,
        sortOrder: detail.sortOrder,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      },
      detailProps
    )
    assert.deepEqual(
      {
        id: listItem.id,
        title: listItem.title,
        status: listItem.status,
        label: listItem.label,
        priority: listItem.priority,
        difficulty: listItem.difficulty,
        assignedTo: listItem.assignedTo,
        dueDate: listItem.dueDate,
        organizationId: listItem.organizationId,
        projectId: listItem.projectId,
        sortOrder: listItem.sortOrder,
        createdAt: listItem.createdAt,
      },
      listProps
    )
    assert.deepEqual(
      {
        id: summary.id,
        title: summary.title,
        status: summary.status,
        priority: summary.priority,
      },
      summaryProps
    )
  })

  test('fromEntity factories map task entities using shared internal helpers', ({ assert }) => {
    const entity = makeTaskEntity()

    const detail = TaskDetailResponseDTO.fromEntity(entity)
    const listItem = TaskListItemResponseDTO.fromEntity(entity)
    const summary = TaskSummaryResponseDTO.fromEntity(entity)

    assert.equal(detail.id, entity.id)
    assert.equal(detail.description, entity.description)
    assert.equal(detail.taskStatusId, entity.taskStatusId)
    assert.equal(detail.taskVisibility, entity.taskVisibility)
    assert.equal(detail.externalApplicationsCount, entity.externalApplicationsCount)
    assert.equal(detail.updatedAt, entity.updatedAt)

    assert.equal(listItem.id, entity.id)
    assert.equal(listItem.label, entity.label)
    assert.equal(listItem.difficulty, entity.difficulty)
    assert.equal(listItem.projectId, entity.projectId)
    assert.equal(listItem.createdAt, entity.createdAt)

    assert.equal(summary.id, entity.id)
    assert.equal(summary.title, entity.title)
    assert.equal(summary.status, entity.status)
    assert.equal(summary.priority, entity.priority)
  })
})
