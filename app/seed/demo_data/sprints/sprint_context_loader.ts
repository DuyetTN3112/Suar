import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  SeededSprint,
  SeededTask,
  SeededUser,
  UserKey,
} from '../types.js'

export const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'status',
  'priority',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
] as const

export function packageId(sprintId: string, reviewer: UserKey): string {
  return `${sprintId}-pkg-${reviewer}`
}

export function reviewId(packageIdValue: string, suffix: string): string {
  return `${packageIdValue}-${suffix}`
}

export function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function parseJsonFields(
  row: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const output = { ...row }
  for (const field of fields) {
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

export async function loadSprintPartyContext(
  trx: TransactionClientContract,
  user: SeededUser,
  sprint: SeededSprint
): Promise<Record<string, unknown>> {
  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', user.id)
    .select(
      'id',
      'version',
      'snapshot_name',
      'is_current',
      'is_public',
      'summary',
      'skills_verified',
      'work_highlights',
      'performance_metrics',
      'trust_metrics',
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined
  const taskHistory = (await trx
    .from('user_work_history')
    .where('user_id', user.id)
    .where('organization_id', sprint.organizationId)
    .where('project_id', sprint.projectId)
    .select(
      'id',
      'task_id',
      'task_assignment_id',
      'organization_id',
      'project_id',
      'task_title',
      'task_type',
      'business_domain',
      'problem_category',
      'role_in_task',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .limit(10)) as Record<string, unknown>[]
  const workSchedule = (await trx
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', sprint.organizationId)
    .where('project_id', sprint.projectId)
    .where('project_sprint_id', sprint.id)
    .where((builder) => {
      void builder.where('assigned_to', user.id).orWhere('creator_id', user.id)
    })
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: user.id,
    username: user.username,
    system_role: user.systemRole,
    current_organization_id: sprint.organizationId,
    profile: profile
      ? parseJsonFields(profile, [
          'summary',
          'skills_verified',
          'work_highlights',
          'performance_metrics',
          'trust_metrics',
        ])
      : {},
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}

export async function loadSeedTaskRows(
  trx: TransactionClientContract,
  tasks: SeededTask[]
): Promise<Record<string, unknown>[]> {
  if (tasks.length === 0) {
    return []
  }

  return (await trx
    .from('tasks')
    .whereIn(
      'id',
      tasks.map((task) => task.id)
    )
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

export async function loadSprintTaskRows(
  trx: TransactionClientContract,
  sprintId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks')
    .where('project_sprint_id', sprintId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')) as Record<string, unknown>[]
}

export async function loadProjectTaskRows(
  trx: TransactionClientContract,
  projectId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNull('deleted_at')
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)) as Record<string, unknown>[]
}

export async function loadManagerAssignedTasks(
  trx: TransactionClientContract,
  sprint: SeededSprint,
  reviewerId: string,
  managerId: string
): Promise<Record<string, unknown>[]> {
  return (await trx
    .from('tasks as t')
    .leftJoin('task_assignments as ta', 'ta.task_id', 't.id')
    .where('t.project_sprint_id', sprint.id)
    .where('t.assigned_to', reviewerId)
    .whereNull('t.deleted_at')
    .where((builder) => {
      void builder.where('t.creator_id', managerId).orWhere('ta.assigned_by', managerId)
    })
    .distinct(...TASK_CONTEXT_COLUMNS.map((column) => `t.${column}`))
    .orderBy('t.updated_at', 'desc')) as Record<string, unknown>[]
}
