import {
  type AssignmentDeliverySource,
  type TaskFactSourceReader,
} from '#modules/tasks/actions/ports/outbound/task_fact_source_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { AssignmentDeliveryFactV1 } from '#modules/tasks/public_contracts/assignment_delivery_fact_v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function toFact(row: AssignmentDeliverySource): AssignmentDeliveryFactV1 | null {
  const assignedAt = toIso(row.assigned_at)
  if (assignedAt === null) return null

  return {
    contractVersion: 1,
    assignmentId: row.assignment_id,
    taskId: row.task_id,
    assigneeId: row.assignee_id,
    assignmentStatus: row.assignment_status,
    estimatedHours: toNumber(row.estimated_hours),
    actualHours: toNumber(row.actual_hours),
    assignedAt,
    completedAt: toIso(row.completed_at),
    taskDueDate: toIso(row.task_due_date),
  }
}

export default class ListAssignmentDeliveryFactsV1Query {
  constructor(private readonly sources: TaskFactSourceReader) {}

  async execute(
    userId: string,
    trx?: TaskTransaction
  ): Promise<AssignmentDeliveryFactV1[]> {
    if (!UUID_PATTERN.test(userId)) return []

    const rows = await this.sources.listAssignmentDelivery(userId, trx)
    return rows.flatMap((row) => {
      const fact = toFact(row)
      return fact === null ? [] : [fact]
    })
  }
}
