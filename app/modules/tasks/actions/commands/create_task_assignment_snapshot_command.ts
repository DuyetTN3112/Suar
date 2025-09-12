import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task_assignment_snapshot_rules'

export interface CreateTaskAssignmentSnapshotDTO {
  task_assignment_id: string
  task_id: string
  snapshot_reason: 'assigned' | 'submitted' | 'review_started' | 'disputed'
}

export interface TaskAssignmentSnapshotResult {
  id: string
  task_assignment_id: string
  task_id: string
  snapshot_reason: 'assigned' | 'submitted' | 'review_started' | 'disputed'
  task_snapshot: Record<string, unknown>
  required_skills_snapshot: Record<string, unknown>[]
  acceptance_criteria_snapshot: Record<string, unknown>
  workflow_snapshot: Record<string, unknown>
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    return JSON.parse(value) as Record<string, unknown>
  }

  return value as Record<string, unknown>
}

function asJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') {
    return JSON.parse(value) as Record<string, unknown>[]
  }

  return value as Record<string, unknown>[]
}

function normalizeSnapshot(row: Record<string, unknown>): TaskAssignmentSnapshotResult {
  return {
    id: row.id as string,
    task_assignment_id: row.task_assignment_id as string,
    task_id: row.task_id as string,
    snapshot_reason: row.snapshot_reason as TaskAssignmentSnapshotResult['snapshot_reason'],
    task_snapshot: asJsonObject(row.task_snapshot),
    required_skills_snapshot: asJsonArray(row.required_skills_snapshot),
    acceptance_criteria_snapshot: asJsonObject(row.acceptance_criteria_snapshot),
    workflow_snapshot: asJsonObject(row.workflow_snapshot),
  }
}

export default class CreateTaskAssignmentSnapshotCommand {
  async execute(dto: CreateTaskAssignmentSnapshotDTO): Promise<TaskAssignmentSnapshotResult> {
    const trx = await db.transaction()

    try {
      const assignment = (await trx
        .from('task_assignments')
        .where('id', dto.task_assignment_id)
        .forUpdate()
        .first()) as { id: string; task_id: string } | undefined

      if (!assignment) {
        throw new NotFoundException('Task assignment not found')
      }

      const task = (await trx
        .from('tasks')
        .where('id', dto.task_id)
        .forUpdate()
        .first()) as
        | {
            id: string
            title: string
            description: string
            status: string
            task_status_id: string
            verification_method: string
            acceptance_criteria: string
            task_type: string
            difficulty: string
            expected_deliverables: string | unknown[]
            organization_id: string
            project_id: string
            deleted_at: Date | string | null
          }
        | undefined

      if (!task) {
        throw new NotFoundException('Task not found')
      }

      const existing = (await trx
        .from('task_assignment_snapshots')
        .where('task_assignment_id', dto.task_assignment_id)
        .where('snapshot_reason', dto.snapshot_reason)
        .first()) as Record<string, unknown> | null | undefined

      const policyResult = canCreateTaskAssignmentSnapshot({
        assignmentExists: true,
        taskDeleted: task.deleted_at !== null,
        taskMatchesAssignment: assignment.task_id === task.id,
        hasDuplicateReason: existing !== null && existing !== undefined,
        snapshotReason: dto.snapshot_reason,
      })

      if (!policyResult.allowed) {
        throw new BusinessLogicException(policyResult.reason)
      }

      const requiredSkills = (await trx
        .from('task_required_skills')
        .where('task_id', task.id)
        .select('*')) as Record<string, unknown>[]

      const [created] = (await trx
        .table('task_assignment_snapshots')
        .insert({
          task_assignment_id: assignment.id,
          task_id: task.id,
          snapshot_reason: dto.snapshot_reason,
          task_snapshot: JSON.stringify({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            task_status_id: task.task_status_id,
            verification_method: task.verification_method,
            acceptance_criteria: task.acceptance_criteria,
            task_type: task.task_type,
            difficulty: task.difficulty,
            expected_deliverables: task.expected_deliverables,
            organization_id: task.organization_id,
            project_id: task.project_id,
          }),
          required_skills_snapshot: JSON.stringify(requiredSkills),
          acceptance_criteria_snapshot: JSON.stringify({
            acceptance_criteria: task.acceptance_criteria,
            verification_method: task.verification_method,
          }),
          workflow_snapshot: JSON.stringify({
            status: task.status,
            task_status_id: task.task_status_id,
          }),
        })
        .returning('*')) as [Record<string, unknown>]

      await trx.commit()
      return normalizeSnapshot(created)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
