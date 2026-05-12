import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import Task from '#infra/tasks/models/task'

const TASK_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USER_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const ORG_ID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const PROJECT_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a'
const STATUS_ID = 'e5f6a7b8-c9d0-4e1f-8a2b-3c4d5e6f7a8b'

function makeTaskModel(): Task {
  const task = new Task()
  task.id = TASK_ID
  task.title = 'Refactor task create boundary'
  task.description = 'Seal Lucid model from task create action support'
  task.status = 'todo'
  task.task_status_id = STATUS_ID
  task.label = 'feature'
  task.priority = 'medium'
  task.difficulty = 'medium'
  task.assigned_to = null
  task.creator_id = USER_ID
  task.updated_by = null
  task.due_date = DateTime.fromISO('2026-05-15T08:00:00.000Z')
  task.deleted_at = null
  task.created_at = DateTime.fromISO('2026-05-08T08:00:00.000Z')
  task.updated_at = DateTime.fromISO('2026-05-08T09:00:00.000Z')
  task.parent_task_id = null
  task.estimated_time = 8
  task.actual_time = 0
  task.organization_id = ORG_ID
  task.project_id = PROJECT_ID
  task.task_visibility = 'internal'
  task.application_deadline = null
  task.task_type = 'implementation'
  task.acceptance_criteria = 'Boundary returns plain records'
  task.verification_method = 'unit_test'
  task.expected_deliverables = [{ type: 'code' }]
  task.context_background = 'Architecture refactor'
  task.impact_scope = 'task create'
  task.tech_stack = ['adonisjs', 'typescript']
  task.environment = 'backend'
  task.collaboration_type = 'solo'
  task.complexity_notes = null
  task.measurable_outcomes = [{ metric: 'lucid_leaks', target: 0 }]
  task.learning_objectives = ['repository boundary']
  task.domain_tags = ['tasks']
  task.role_in_task = 'owner'
  task.autonomy_level = 'high'
  task.problem_category = 'architecture'
  task.business_domain = 'workflow'
  task.estimated_users_affected = 3
  task.estimated_budget = null
  task.external_applications_count = 0
  task.sort_order = 10

  return task
}

test.group('TaskInfraMapper', () => {
  test('keeps audit values compatible with current Lucid task JSON shape', ({ assert }) => {
    const task = makeTaskModel()

    assert.deepEqual(TaskInfraMapper.toAuditValues(task), task.toJSON())
  })
})
