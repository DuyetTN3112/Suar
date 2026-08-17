import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface ReviewAssignmentContextSourceRow {
  assignment_id: string
  task_id: string
  assignee_id: string
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  completion_notes: string | null
  task_title: string
  task_description: string
  task_status: string
  task_priority: string
  task_difficulty: string | null
  task_due_date: Date | string | null
  project_id: string | null
  organization_id: string
}

interface AssignmentIdSourceRow {
  assignment_id: string
}

const queryClient = (trx?: TransactionClientContract) => trx ?? db

/**
 * Reads historical assignment/task context, including soft-deleted tasks.
 * Review sessions remain auditable after their source task is archived.
 */
export async function findReviewAssignmentContextSourceRows(
  assignmentIds: string[],
  trx?: TransactionClientContract
): Promise<ReviewAssignmentContextSourceRow[]> {
  if (assignmentIds.length === 0) return []

  return (await queryClient(trx)
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .whereIn('ta.id', assignmentIds)
    .select(
      'ta.id as assignment_id',
      'ta.task_id',
      'ta.assignee_id',
      'ta.assignment_status',
      'ta.estimated_hours',
      'ta.actual_hours',
      'ta.completion_notes',
      't.title as task_title',
      't.description as task_description',
      't.status as task_status',
      't.priority as task_priority',
      't.difficulty as task_difficulty',
      't.due_date as task_due_date',
      't.project_id',
      't.organization_id'
    )
    .orderBy('ta.id', 'asc')) as ReviewAssignmentContextSourceRow[]
}

export async function listAssignmentIdSourceRowsByTaskIds(
  taskIds: string[],
  trx?: TransactionClientContract
): Promise<AssignmentIdSourceRow[]> {
  if (taskIds.length === 0) return []

  return (await queryClient(trx)
    .from('task_assignments as ta')
    .whereIn('ta.task_id', taskIds)
    .select('ta.id as assignment_id')
    .orderBy('ta.id', 'asc')) as AssignmentIdSourceRow[]
}

export async function listAssignmentIdSourceRowsByProjectIds(
  projectIds: string[],
  trx?: TransactionClientContract
): Promise<AssignmentIdSourceRow[]> {
  if (projectIds.length === 0) return []

  return (await queryClient(trx)
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .whereIn('t.project_id', projectIds)
    .whereNull('t.deleted_at')
    .select('ta.id as assignment_id')
    .orderBy('ta.id', 'asc')) as AssignmentIdSourceRow[]
}

/**
 * Preserves the historical pending-review membership scope, where archiving a
 * task must not make its already-created review session disappear.
 */
export async function listAssignmentIdSourceRowsByProjectIdsIncludingDeletedTasks(
  projectIds: string[],
  trx?: TransactionClientContract
): Promise<AssignmentIdSourceRow[]> {
  if (projectIds.length === 0) return []

  return (await queryClient(trx)
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .whereIn('t.project_id', projectIds)
    .select('ta.id as assignment_id')
    .orderBy('ta.id', 'asc')) as AssignmentIdSourceRow[]
}

export async function listAssignmentIdSourceRowsByTaskStatusIds(
  taskStatusIds: string[],
  trx?: TransactionClientContract
): Promise<AssignmentIdSourceRow[]> {
  if (taskStatusIds.length === 0) return []

  return (await queryClient(trx)
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .whereIn('t.task_status_id', taskStatusIds)
    .whereNull('t.deleted_at')
    .select('ta.id as assignment_id')
    .orderBy('ta.id', 'asc')) as AssignmentIdSourceRow[]
}
