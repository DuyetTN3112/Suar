import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { canCreateTaskAssignmentSnapshot } from '#modules/tasks/domain/task-assignment/task_assignment_snapshot_rules'

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
    id: row['id'] as string,
    task_assignment_id: row['task_assignment_id'] as string,
    task_id: row['task_id'] as string,
    snapshot_reason: row['snapshot_reason'] as TaskAssignmentSnapshotResult['snapshot_reason'],
    task_snapshot: asJsonObject(row['task_snapshot']),
    required_skills_snapshot: asJsonArray(row['required_skills_snapshot']),
    acceptance_criteria_snapshot: asJsonObject(row['acceptance_criteria_snapshot']),
    workflow_snapshot: asJsonObject(row['workflow_snapshot']),
  }
}

export default class CreateTaskAssignmentSnapshotCommand extends BaseCommand<
  CreateTaskAssignmentSnapshotDTO,
  TaskAssignmentSnapshotResult
> {
  constructor(private readonly dependencies: TaskExternalDependencies) {
    super(dependencies.transactions)
  }

  override async handle(
    dto: CreateTaskAssignmentSnapshotDTO
  ): Promise<TaskAssignmentSnapshotResult> {
    return this.executeInTransaction(async (trx) => {
      const assignment = await this.dependencies.assignments.findWithTaskForUpdate(
        dto.task_assignment_id,
        trx
      )

      if (!assignment) {
        throw new NotFoundException('Task assignment not found')
      }

      const task = await this.dependencies.completion.lockSubmissionTask(
        dto.task_id,
        trx
      )

      if (!task) {
        throw new NotFoundException('Task not found')
      }

      const existing = await this.dependencies.completion.assignmentSnapshotExists(
        dto.task_assignment_id,
        dto.snapshot_reason,
        trx
      )

      const policyResult = canCreateTaskAssignmentSnapshot({
        assignmentExists: true,
        taskDeleted: task.deleted_at !== null,
        taskMatchesAssignment: assignment.task_id === task.id,
        hasDuplicateReason: existing,
        snapshotReason: dto.snapshot_reason,
      })

      if (!policyResult.allowed) {
        throw new BusinessLogicException(policyResult.reason)
      }

      const requiredSkills =
        await this.dependencies.completion.listRequiredSkillSnapshots(task.id, trx)

      const created = await this.dependencies.completion.createAssignmentSnapshot({
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
        }, trx)

      return normalizeSnapshot(created)
    })
  }

  /** Backward-compatible adapter for callers that still use the legacy verb. */
  async execute(dto: CreateTaskAssignmentSnapshotDTO): Promise<TaskAssignmentSnapshotResult> {
    return this.handle(dto)
  }
}
