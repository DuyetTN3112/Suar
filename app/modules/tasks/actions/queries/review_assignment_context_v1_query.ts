import {
  type ReviewAssignmentContextSource,
  type TaskFactSourceReader,
} from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { ReviewAssignmentContextV1 } from '#modules/tasks/public_contracts/review_assignment_context_v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function uniqueValidIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => UUID_PATTERN.test(id)))]
}

function toNumber(value: number | string | null): number | null {
  if (value === null) return null
  const converted = Number(value)
  return Number.isFinite(converted) ? converted : null
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function toFact(row: ReviewAssignmentContextSource): ReviewAssignmentContextV1 {
  return {
    contractVersion: 1,
    id: row.assignment_id,
    taskId: row.task_id,
    assigneeId: row.assignee_id,
    assignmentStatus: row.assignment_status,
    estimatedHours: toNumber(row.estimated_hours),
    actualHours: toNumber(row.actual_hours),
    completionNotes: row.completion_notes,
    task: {
      id: row.task_id,
      title: row.task_title,
      description: row.task_description,
      status: row.task_status,
      priority: row.task_priority,
      difficulty: row.task_difficulty,
      dueDate: toIso(row.task_due_date),
      projectId: row.project_id,
      organizationId: row.organization_id,
    },
  }
}

export default class ReviewAssignmentContextV1Query {
  constructor(private readonly sources: TaskFactSourceReader) {}

  async find(
    assignmentIds: string[],
    trx?: TaskTransaction
  ): Promise<ReviewAssignmentContextV1[]> {
    const normalizedIds = uniqueValidIds(assignmentIds)
    if (normalizedIds.length === 0) return []

    const rows = await this.sources.findReviewAssignmentContexts(normalizedIds, trx)
    return rows.map(toFact)
  }

  async listAssignmentIdsByTaskIds(
    taskIds: string[],
    trx?: TaskTransaction
  ): Promise<string[]> {
    const normalizedIds = uniqueValidIds(taskIds)
    return normalizedIds.length === 0
      ? []
      : this.sources.listAssignmentIdsByTaskIds(normalizedIds, trx)
  }

  async listAssignmentIdsByProjectIds(
    projectIds: string[],
    trx?: TaskTransaction
  ): Promise<string[]> {
    const normalizedIds = uniqueValidIds(projectIds)
    return normalizedIds.length === 0
      ? []
      : this.sources.listAssignmentIdsByProjectIds(normalizedIds, trx)
  }

  async listAssignmentIdsByProjectIdsIncludingDeletedTasks(
    projectIds: string[],
    trx?: TaskTransaction
  ): Promise<string[]> {
    const normalizedIds = uniqueValidIds(projectIds)
    return normalizedIds.length === 0
      ? []
      : this.sources.listAssignmentIdsByProjectIdsIncludingDeletedTasks(
          normalizedIds,
          trx
        )
  }

  async listAssignmentIdsByTaskStatusIds(
    taskStatusIds: string[],
    trx?: TaskTransaction
  ): Promise<string[]> {
    const normalizedIds = uniqueValidIds(taskStatusIds)
    return normalizedIds.length === 0
      ? []
      : this.sources.listAssignmentIdsByTaskStatusIds(normalizedIds, trx)
  }
}
