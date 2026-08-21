import { test } from '@japa/runner'

import {
  buildCreateTaskDTO,
  buildUpdateTaskDTO,
  buildGetTaskAuditLogsInput,
  buildGetTasksIndexPageInput,
} from '#modules/tasks/controllers/mappers/request/task-reading/task_request_mapper'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const VALID_UUID_4 = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a'

function validCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Create canonical task',
    taskStatusId: VALID_UUID,
    projectId: VALID_UUID_2,
    acceptanceCriteria: 'Task is reviewable and complete',
    requiredSkills: [
      {
        id: VALID_UUID_3,
        level: 'l4',
      },
    ],
    ...overrides,
  }
}

function fakeRequest(body: Record<string, unknown>) {
  return {
    body() {
      return body
    },
    input(key: string) {
      return body[key]
    },
  }
}
test.group('', () => {
  test('buildGetTasksIndexPageInput normalizes page and limit with shared pagination rules', ({
    assert,
  }) => {
    const input = buildGetTasksIndexPageInput(
      fakeRequest({
        page: '0',
        limit: '999',
        status: 'status-1',
        priority: 'high',
      }) as never,
      'org-1'
    )

    assert.deepEqual(input, {
      page: 1,
      limit: 100,
      task_status_id: ['status-1'],
      priority: ['high'],
      organization_id: 'org-1',
      sort_by: 'due_date',
      sort_order: 'asc',
    })
  })

  test('buildGetTasksIndexPageInput accepts canonical camelCase task filter query params', ({
    assert,
  }) => {
    const input = buildGetTasksIndexPageInput(
      fakeRequest({
        taskStatusId: 'status-2',
        assignedTo: 'user-2',
        parentTaskId: null,
        projectId: 'project-2',
        sortBy: 'updated_at',
        sortOrder: 'desc',
      }) as never,
      'org-1'
    )

    assert.deepEqual(input, {
      page: 1,
      limit: 10,
      task_status_id: ['status-2'],
      assigned_to: ['user-2'],
      parent_task_id: null,
      requested_project_id: 'project-2',
      organization_id: 'org-1',
      sort_by: 'updated_at',
      sort_order: 'desc',
    })
  })

  test('buildGetTaskAuditLogsInput clamps oversized limits', ({ assert }) => {
    const input = buildGetTaskAuditLogsInput(
      fakeRequest({
        limit: '999',
      }) as never,
      'task-1'
    )

    assert.deepEqual(input, {
      taskId: 'task-1',
      limit: 100,
    })
  })

  test('buildCreateTaskDTO accepts canonical camelCase task-create payloads', async ({
    assert,
  }) => {
    const dto = await buildCreateTaskDTO(
      fakeRequest({
        ...validCreateBody(),
        verificationMethod: 'code_review',
        estimatedTime: 5,
        dueDate: '2026-07-10',
        requiredSkills: [
          {
            id: VALID_UUID_3,
            level: 'l4',
            projectSkillId: VALID_UUID_4,
            minimumLevelId: VALID_UUID,
            targetLevelId: VALID_UUID_2,
            assessmentCeilingLevelId: VALID_UUID_3,
            isMandatory: true,
            requirementSource: 'manual',
            requirementNotes: 'Baseline delivery skill',
          },
        ],
      }) as never,
      VALID_UUID_4
    )

    assert.equal(dto.task_status_id, VALID_UUID)
    assert.equal(dto.project_id, VALID_UUID_2)
    assert.equal(dto.acceptance_criteria, 'Task is reviewable and complete')
    assert.equal(dto.required_skills[0]?.level, 'l4')
    assert.equal(dto.required_skills[0]?.project_skill_id, VALID_UUID_4)
    assert.equal(dto.required_skills[0]?.minimum_level_id, VALID_UUID)
    assert.equal(dto.required_skills[0]?.requirement_notes, 'Baseline delivery skill')
  })

  test('buildCreateTaskDTO accepts custom required skill names with category', async ({
    assert,
  }) => {
    const dto = await buildCreateTaskDTO(
      fakeRequest({
        ...validCreateBody(),
        requiredSkills: [
          {
            id: 'custom:technology:graphql-federation',
            level: 'l4',
            customName: 'GraphQL Federation',
            categoryCode: 'technology',
          },
        ],
      }) as never,
      VALID_UUID_4
    )

    assert.equal(dto.required_skills[0]?.id, 'custom:technology:graphql-federation')
    assert.equal(dto.required_skills[0]?.custom_name, 'GraphQL Federation')
    assert.equal(dto.required_skills[0]?.category_code, 'technology')
  })

  test('buildCreateTaskDTO rejects non-custom required skill ids that are not UUIDs', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest({
            ...validCreateBody(),
            requiredSkills: [
              {
                id: 'react',
                level: 'l4',
              },
            ],
          }) as never,
          VALID_UUID_4
        ),
      /ID kỹ năng yêu cầu không hợp lệ/
    )
  })

  test('buildCreateTaskDTO rejects legacy required skill levels at request boundary', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest({
            title: 'Reject legacy level task',
            taskStatusId: VALID_UUID,
            projectId: VALID_UUID_2,
            acceptanceCriteria: 'Task is reviewable and complete',
            requiredSkills: [
              {
                id: VALID_UUID_3,
                level: 'middle',
              },
            ],
          }) as never,
          VALID_UUID_4
        ),
      /Cấp độ kỹ năng không hợp lệ: middle/
    )
  })

  test('buildCreateTaskDTO rejects missing and blank task titles before command execution', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest(validCreateBody({ title: undefined })) as never,
          VALID_UUID_4
        ),
      'Validation failure'
    )

    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest(validCreateBody({ title: ' \n\t ' })) as never,
          VALID_UUID_4
        ),
      'Validation failure'
    )
  })

  test('buildCreateTaskDTO rejects overlong titles and invalid enum values', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest(validCreateBody({ title: 'A'.repeat(256) })) as never,
          VALID_UUID_4
        ),
      'Validation failure'
    )

    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest(validCreateBody({ priority: 'impossible' })) as never,
          VALID_UUID_4
        ),
      'Validation failure'
    )
  })

  test('task request mappers reject a non-empty Task-level business domain', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildCreateTaskDTO(
          fakeRequest(validCreateBody({ domainTags: ['fintech'] })) as never,
          VALID_UUID_4
        ),
      /Lĩnh vực của Task được kế thừa từ Project/
    )

    await assert.rejects(
      () =>
        buildUpdateTaskDTO(
          fakeRequest({ title: 'Update without task domain', businessDomain: 'fintech' }) as never,
          VALID_UUID
        ),
      /Lĩnh vực của Task được kế thừa từ Project/
    )
  })

  test('buildUpdateTaskDTO accepts canonical optimistic concurrency precondition', async ({
    assert,
  }) => {
    const dto = await buildUpdateTaskDTO(
      fakeRequest({
        title: 'Update guarded task',
        expectedUpdatedAt: '2026-07-14T07:00:00.000Z',
      }) as never,
      VALID_UUID
    )

    assert.equal(dto.title, 'Update guarded task')
    assert.equal(dto.updated_by, VALID_UUID)
    assert.equal(dto.expected_updated_at, '2026-07-14T07:00:00.000Z')
    assert.deepEqual(dto.getUpdatedFields(), ['title'])
  })


})
