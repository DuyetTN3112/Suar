import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface PartyContextScope {
  organizationId: string
  projectId: string
  sprintId: string | null
}

export interface TaskAssignmentContextRow extends Record<string, unknown> {
  id: string
  assigned_by?: string | null
  assignment_status?: string | null
  assigned_at?: Date | string | null
  completed_at?: Date | string | null
}

export const TASK_CONTEXT_COLUMNS = [
  'id',
  'title',
  'description',
  'acceptance_criteria',
  'status',
  'priority',
  'difficulty',
  'complexity',
  'complexity_notes',
  'estimated_time',
  'actual_time',
  'autonomy_expected',
  'autonomy_level',
  'minimum_level_id',
  'target_level_id',
  'assessment_ceiling_level_id',
  'task_type',
  'business_domain',
  'problem_category',
  'impact_scope',
  'collaboration_type',
  'tech_stack',
  'domain_tags',
  'expected_deliverables',
  'measurable_outcomes',
  'learning_objectives',
  'verification_method',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'updated_at',
]

export function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function parseJsonFields(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const field of fields) {
    if (field in output) {
      output[field] = parseJsonValue(output[field])
    }
  }
  return output
}

export function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function recordValue(value: unknown): Record<string, unknown> {
  const parsed = parseJsonValue(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}

export function recordArray(value: unknown): Record<string, unknown>[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed)
    ? parsed.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : []
}

export function stringArray(value: unknown): string[] {
  const parsed = parseJsonValue(value)
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === 'string')
    : []
}

export async function loadPartyContext(
  transaction: TransactionClientContract,
  userId: string | null,
  scope: PartyContextScope
): Promise<Record<string, unknown>> {
  if (!userId) {
    return { user_id: null, profile: {}, work_schedule: [], task_history: [] }
  }

  const user = (await transaction
    .from('users')
    .where('id', userId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined
  const profile = (await transaction
    .from('user_profile_snapshots')
    .where('user_id', userId)
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
      'scoring_version',
      'created_at',
      'updated_at'
    )
    .orderBy('is_current', 'desc')
    .orderBy('version', 'desc')
    .first()) as Record<string, unknown> | undefined
  const performanceStats = (await transaction
    .from('user_performance_stats')
    .where('user_id', userId)
    .orderBy('calculated_at', 'desc')
    .first()) as Record<string, unknown> | undefined
  const verifiedSkills = (await transaction
    .from('user_skills as user_skill')
    .leftJoin('skills as skill', 'skill.id', 'user_skill.skill_id')
    .where('user_skill.user_id', userId)
    .select(
      'user_skill.skill_id as skill_id',
      'skill.skill_name as skill_name',
      'user_skill.verified_public_proficiency_code as verified_public_proficiency_code',
      'user_skill.avg_percentage as avg_percentage',
      'user_skill.confidence as confidence',
      'user_skill.total_reviews as total_reviews',
      'user_skill.evidence_count as evidence_count',
      'user_skill.dispute_pending_count as dispute_pending_count',
      'user_skill.last_calculated_at as last_calculated_at'
    )
    .orderBy('user_skill.avg_percentage', 'desc')
    .limit(30)) as Record<string, unknown>[]
  const taskHistory = (await transaction
    .from('user_work_history')
    .where('user_id', userId)
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
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
    .orderBy('created_at', 'desc')
    .limit(10)) as Record<string, unknown>[]
  const workScheduleQuery = transaction
    .from('tasks')
    .whereNull('deleted_at')
    .where('organization_id', scope.organizationId)
    .where('project_id', scope.projectId)
    .where((builder) => {
      void builder.where('assigned_to', userId).orWhere('creator_id', userId)
    })
  if (scope.sprintId) {
    void workScheduleQuery.where('project_sprint_id', scope.sprintId)
  }
  const workSchedule = (await workScheduleQuery
    .select(...TASK_CONTEXT_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)) as Record<string, unknown>[]

  return {
    user_id: userId,
    username: user?.['username'] ?? null,
    system_role: user?.['system_role'] ?? null,
    current_organization_id: user?.['current_organization_id'] ?? null,
    timezone: user?.['timezone'] ?? null,
    status: user?.['status'] ?? null,
    profile: profile
      ? parseJsonFields(profile, [
          'summary',
          'skills_verified',
          'work_highlights',
          'performance_metrics',
          'trust_metrics',
        ])
      : {},
    canonical_profile_inputs: {
      performance_stats: performanceStats
        ? parseJsonFields(performanceStats, [
            'tasks_by_difficulty',
            'tasks_by_domain',
            'tasks_by_type',
          ])
        : null,
      verified_skills: verifiedSkills,
    },
    work_schedule: workSchedule,
    task_history: taskHistory,
  }
}
