import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'

export interface CompletedAssignmentProfileSourceRow {
  task_assignment_id: string
  task_id: string
  organization_id: string
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: unknown
  domain_tags: unknown
  difficulty: string | null
  estimated_time: number | string | null
  actual_time: number | string | null
  assignment_estimated_hours: number | string | null
  assignment_actual_hours: number | string | null
  due_date: Date | string | null
  completed_at: Date | string | null
  measurable_outcomes: unknown
  impact_scope: string | null
}

/**
 * One Tasks-owned batch read for all completed, still-valid assignments of a user.
 */
export async function listCompletedAssignmentProfileSourceRows(
  userId: string,
  trx?: TransactionClientContract
): Promise<CompletedAssignmentProfileSourceRow[]> {
  const client = trx ?? db
  return (await client
    .from('task_assignments as ta')
    .join('tasks as t', 't.id', 'ta.task_id')
    .where('ta.assignee_id', userId)
    .where('ta.assignment_status', AssignmentStatus.COMPLETED)
    .whereNull('t.deleted_at')
    .select(
      'ta.id as task_assignment_id',
      'ta.task_id',
      't.organization_id',
      't.project_id',
      't.title as task_title',
      't.task_type',
      't.business_domain',
      't.problem_category',
      't.role_in_task',
      't.autonomy_level',
      't.collaboration_type',
      't.tech_stack',
      't.domain_tags',
      't.difficulty',
      't.estimated_time',
      't.actual_time',
      'ta.estimated_hours as assignment_estimated_hours',
      'ta.actual_hours as assignment_actual_hours',
      't.due_date',
      'ta.completed_at',
      't.measurable_outcomes',
      't.impact_scope'
    )
    .orderByRaw('ta.completed_at ASC NULLS LAST')
    .orderBy('ta.id', 'asc')) as CompletedAssignmentProfileSourceRow[]
}
