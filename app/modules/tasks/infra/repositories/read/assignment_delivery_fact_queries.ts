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
 * One Tasks-owned batch read for every still-valid assignment of an assignee.
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
