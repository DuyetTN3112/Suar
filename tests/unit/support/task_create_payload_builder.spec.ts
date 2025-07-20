import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import { buildCreateTaskPersistencePayload } from '#actions/tasks/support/task_create_payload_builder'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

function makeCreateTaskDTO() {
  return new CreateTaskDTO({
    title: 'Build marketplace filters',
    description: 'Tighten search behavior',
    task_status_id: VALID_UUID_3,
    project_id: VALID_UUID_2,
    organization_id: VALID_UUID,
    acceptance_criteria: 'All filters map correctly',
    required_skills: [{ id: VALID_UUID_3, level: 'middle' }],
    label: 'feature',
    priority: 'high',
    assigned_to: VALID_UUID_2,
    parent_task_id: VALID_UUID,
    estimated_time: 8,
    actual_time: 3,
    task_type: 'feature_development',
    verification_method: 'code_review',
    expected_deliverables: [{ kind: 'checklist' }],
    context_background: 'Existing page has drift',
    impact_scope: 'tasks',
    tech_stack: ['adonis', 'svelte'],
    environment: 'staging',
    collaboration_type: 'pairing',
    complexity_notes: 'Cross-module',
    measurable_outcomes: [{ metric: 'regressions' }],
    learning_objectives: ['clean architecture'],
    domain_tags: ['tasks'],
    role_in_task: 'backend',
    autonomy_level: 'high',
    problem_category: 'workflow',
    business_domain: 'operations',
    estimated_users_affected: 42,
  })
}

test.group('Task create payload builder', () => {
  test('maps normalized DTO fields into the task persistence payload', ({ assert }) => {
    const dto = makeCreateTaskDTO()
    const resolvedDueDate = DateTime.fromISO('2026-04-20T00:00:00.000Z')

    const payload = buildCreateTaskPersistencePayload(
      dto,
      VALID_UUID,
      { id: VALID_UUID_3, category: 'todo' },
      resolvedDueDate
    )

    assert.deepInclude(payload, {
      title: dto.title,
      description: dto.description,
      status: 'todo',
      task_status_id: VALID_UUID_3,
      task_type: dto.task_type,
      acceptance_criteria: dto.acceptance_criteria,
      verification_method: dto.verification_method,
      context_background: dto.context_background,
      impact_scope: dto.impact_scope,
      environment: dto.environment,
      collaboration_type: dto.collaboration_type,
      complexity_notes: dto.complexity_notes,
      role_in_task: dto.role_in_task,
      autonomy_level: dto.autonomy_level,
      problem_category: dto.problem_category,
      business_domain: dto.business_domain,
      estimated_users_affected: dto.estimated_users_affected,
      label: dto.label,
      priority: dto.priority,
      assigned_to: dto.assigned_to,
      parent_task_id: dto.parent_task_id,
      estimated_time: dto.estimated_time,
      actual_time: dto.actual_time,
      project_id: dto.project_id,
      organization_id: dto.organization_id,
      creator_id: VALID_UUID,
    })
    assert.deepEqual(payload.expected_deliverables, dto.expected_deliverables)
    assert.deepEqual(payload.measurable_outcomes, dto.measurable_outcomes)
    assert.deepEqual(payload.learning_objectives, dto.learning_objectives)
    assert.deepEqual(payload.domain_tags, dto.domain_tags)
    assert.equal(payload.due_date.toISO(), resolvedDueDate.toISO())
  })

  test('fills nullable persistence fields consistently for optional DTO values', ({ assert }) => {
    const dto = CreateTaskDTO.fromCore({
      title: 'Factory task',
      task_status_id: VALID_UUID_3,
      project_id: VALID_UUID_2,
      organization_id: VALID_UUID,
      required_skills: [{ id: VALID_UUID_3, level: 'middle' }],
    })
    const resolvedDueDate = DateTime.fromISO('2026-04-21T00:00:00.000Z')

    const payload = buildCreateTaskPersistencePayload(
      dto,
      VALID_UUID_2,
      { id: VALID_UUID_3, category: 'todo' },
      resolvedDueDate
    )

    assert.equal(payload.description, '')
    assert.isUndefined(payload.label)
    assert.isUndefined(payload.priority)
    assert.isNull(payload.assigned_to)
    assert.isNull(payload.parent_task_id)
    assert.isNull(payload.context_background)
    assert.isNull(payload.impact_scope)
    assert.isNull(payload.environment)
    assert.isNull(payload.collaboration_type)
    assert.isNull(payload.complexity_notes)
    assert.isNull(payload.role_in_task)
    assert.isNull(payload.autonomy_level)
    assert.isNull(payload.problem_category)
    assert.isNull(payload.business_domain)
    assert.isNull(payload.estimated_users_affected)
  })
})
