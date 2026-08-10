import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface AssignmentDeliverySourceRow {
  assignment_id: string
  task_id: string
  assignee_id: string
  assignment_status: 'active' | 'completed' | 'cancelled'
  estimated_hours: number | string | null
  actual_hours: number | string | null
  assigned_at: Date | string
  completed_at: Date | string | null
  task_due_date: Date | string | null
}

/**
 * One Tasks-owned batch read for assignments that are eligible to affect a
 * profile. Completing a task on the task board is intentionally insufficient:
 * the matching Task Review Board workflow must have reached its terminal
 * `done` state first. This keeps `resolved` disputes visible in review history
 * while preventing them from being counted as delivery/profile evidence.
 */
export async function listAssignmentDeliverySourceRows(
  userId: string,
  trx?: TransactionClientContract
): Promise<AssignmentDeliverySourceRow[]> {
  const client = trx ?? db
  return (await client
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .where('ta.assignee_id', userId)
    .whereNull('t.deleted_at')
    .whereExists((reviewWorkflow) => {
      void reviewWorkflow
        .from('task_review_workflows as trw')
        .whereRaw('trw.task_assignment_id = ta.id')
        .where('trw.status', 'done')
    })
    .select(
      'ta.id as assignment_id',
      'ta.task_id',
      'ta.assignee_id',
      'ta.assignment_status',
      'ta.estimated_hours',
      'ta.actual_hours',
      'ta.assigned_at',
      'ta.completed_at',
      't.due_date as task_due_date'
    )
    .orderBy('ta.assigned_at', 'asc')
    .orderBy('ta.id', 'asc')) as AssignmentDeliverySourceRow[]
}
