import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type TaskContextRow = Record<string, unknown> & {
  id?: string
  organization_id?: string | null
  project_id?: string | null
  project_sprint_id?: string | null
}

export const CONTEXT_TASK_COLUMNS = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'task_type',
  'business_domain',
  'project_business_domains',
  'problem_category',
  'role_in_task',
  'assigned_to',
  'creator_id',
  'organization_id',
  'project_id',
  'project_sprint_id',
  'due_date',
  'estimated_time',
  'actual_time',
  'acceptance_criteria',
  'verification_method',
  'updated_at',
]

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function jsonFields(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const output = { ...row }
  for (const key of keys) {
    if (key in output) {
      output[key] = parseJsonValue(output[key])
    }
  }
  return output
}

export function compactTask(row: Record<string, unknown>): Record<string, unknown> {
  return jsonFields(row, [
    'domain_tags',
    'project_business_domains',
    'expected_deliverables',
    'learning_objectives',
    'measurable_outcomes',
    'tech_stack',
  ])
}

export function compactProfile(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) return {}

  return jsonFields(row, [
    'summary',
    'skills_verified',
    'work_highlights',
    'performance_metrics',
    'trust_metrics',
  ])
}

export function compactWorkHistory(row: Record<string, unknown>): Record<string, unknown> {
  return jsonFields(row, [
    'tech_stack',
    'domain_tags',
    'measurable_outcomes',
    'knowledge_artifacts',
    'skill_scores',
    'evidence_links',
  ])
}

export function addMissingData(missingData: string[], key: string): void {
  if (!missingData.includes(key)) {
    missingData.push(key)
  }
}

export function normalizeOptionalIdentifier(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function loadOrganizationContext(
  trx: TransactionClientContract,
  organizationId: unknown
): Promise<Record<string, unknown>> {
  const normalizedOrganizationId = normalizeOptionalIdentifier(organizationId)
  if (!normalizedOrganizationId) return {}

  const organization = (await trx
    .from('organizations')
    .where('id', normalizedOrganizationId)
    .select('id', 'name', 'slug', 'plan', 'owner_id', 'created_at', 'updated_at')
    .first()) as Record<string, unknown> | undefined

  return organization ?? { id: normalizedOrganizationId }
}

export async function loadProjectContext(
  trx: TransactionClientContract,
  projectId: unknown,
  sprintId: unknown
): Promise<Record<string, unknown>> {
  const normalizedProjectId = normalizeOptionalIdentifier(projectId)
  if (!normalizedProjectId) return {}
  const normalizedSprintId = normalizeOptionalIdentifier(sprintId)

  const project = (await trx
    .from('projects')
    .where('id', normalizedProjectId)
    .select(
      'id',
      'name',
      'description',
      'status',
      'visibility',
      'organization_id',
      'owner_id',
      'manager_id',
      'creator_id',
      'start_date',
      'end_date',
      'tags',
      'business_domains',
      'updated_at'
    )
    .first()) as Record<string, unknown> | undefined

  const sprint = normalizedSprintId
    ? ((await trx
        .from('project_sprints')
        .where('id', normalizedSprintId)
        .select(
          'id',
          'name',
          'goal',
          'status',
          'organization_id',
          'project_id',
          'starts_at',
          'ends_at',
          'review_opened_at',
          'review_closed_at',
          'updated_at'
        )
        .first()) as Record<string, unknown> | undefined)
    : undefined

  const context = project
    ? jsonFields(project, ['tags', 'business_domains'])
    : { id: normalizedProjectId }
  if (normalizedSprintId) {
    context['sprint_id'] = normalizedSprintId
  }
  if (sprint) {
    context['sprint'] = sprint
  }

  return context
}

export async function loadTaskPeers(
  trx: TransactionClientContract,
  task: TaskContextRow | undefined,
  mode: 'project' | 'sprint'
): Promise<Record<string, unknown>[]> {
  const projectId = task?.project_id ?? null
  const sprintId = task?.project_sprint_id ?? null
  const taskId = task?.id ?? null
  if (!projectId || !taskId) return []
  if (mode === 'sprint' && !sprintId) return []

  const query = trx
    .from('tasks')
    .where('project_id', projectId)
    .whereNot('id', taskId)
    .whereNull('deleted_at')
    .select(...CONTEXT_TASK_COLUMNS)
    .orderBy('updated_at', 'desc')
    .limit(20)

  if (mode === 'sprint' && sprintId) {
    void query.where('project_sprint_id', sprintId)
  }

  const rows = (await query) as Record<string, unknown>[]
  return rows.map((row) => compactTask(row))
}

export async function loadPartyContext(
  trx: TransactionClientContract,
  userId: unknown,
  organizationId: unknown,
  projectId: unknown
): Promise<Record<string, unknown>> {
  const normalizedUserId = normalizeOptionalIdentifier(userId)
  const base: Record<string, unknown> = {
    user_id: normalizedUserId,
    profile: {},
    work_schedule: [],
    task_history: [],
  }

  if (!normalizedUserId) return base
  const normalizedOrganizationId = normalizeOptionalIdentifier(organizationId)
  const normalizedProjectId = normalizeOptionalIdentifier(projectId)

  const user = (await trx
    .from('users')
    .where('id', normalizedUserId)
    .select('id', 'username', 'system_role', 'current_organization_id', 'timezone', 'status')
    .first()) as Record<string, unknown> | undefined

  const profile = (await trx
    .from('user_profile_snapshots')
    .where('user_id', normalizedUserId)
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

  const historyQuery = trx
    .from('user_work_history')
    .where('user_id', normalizedUserId)
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
      'autonomy_level',
      'collaboration_type',
      'tech_stack',
      'domain_tags',
      'difficulty',
      'estimated_hours',
      'actual_hours',
      'was_on_time',
      'days_early_or_late',
      'measurable_outcomes',
      'estimated_business_value',
      'knowledge_artifacts',
      'overall_quality_score',
      'skill_scores',
      'evidence_links',
      'is_featured',
      'is_public',
      'completed_at'
    )
    .orderBy('completed_at', 'desc')
    .orderBy('created_at', 'desc')
    .limit(10)

  if (normalizedOrganizationId) {
    void historyQuery.where('organization_id', normalizedOrganizationId)
  }
  if (normalizedProjectId) {
    void historyQuery.where('project_id', normalizedProjectId)
  }

  const scheduleQuery = trx
    .from('tasks')
    .whereNull('deleted_at')
    .where((builder) => {
      void builder.where('assigned_to', normalizedUserId).orWhere('creator_id', normalizedUserId)
    })
    .select(...CONTEXT_TASK_COLUMNS)
    .orderBy('due_date', 'asc')
    .orderBy('updated_at', 'desc')
    .limit(10)

  if (normalizedOrganizationId) {
    void scheduleQuery.where('organization_id', normalizedOrganizationId)
  }
  if (normalizedProjectId) {
    void scheduleQuery.where('project_id', normalizedProjectId)
  }

  const taskHistory = (await historyQuery) as Record<string, unknown>[]
  const workSchedule = (await scheduleQuery) as Record<string, unknown>[]

  return {
    ...base,
    user_id: normalizedUserId,
    username: user?.['username'] ?? null,
    system_role: user?.['system_role'] ?? null,
    current_organization_id: user?.['current_organization_id'] ?? null,
    timezone: user?.['timezone'] ?? null,
    status: user?.['status'] ?? null,
    profile: compactProfile(profile),
    work_schedule: workSchedule.map((row) => compactTask(row)),
    task_history: taskHistory.map((row) => compactWorkHistory(row)),
  }
}
