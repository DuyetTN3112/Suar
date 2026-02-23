const SENSITIVE_KEYS = new Set([
  'access_token',
  'refresh_token',
  'password',
  'email',
  'phone',
  'private_contact',
])
const SENSITIVE_KEY_PARTS = [
  'api_key',
  'apikey',
  'auth_token',
  'credential',
  'email',
  'password',
  'phone',
  'secret',
  'signature',
  'token',
]
const SENSITIVE_URL_PARAM_PARTS = [
  'access_token',
  'apikey',
  'api_key',
  'credential',
  'expires',
  'secret',
  'signature',
  'token',
]

const ALLOWED_DISPUTE_REVIEW_TYPES = new Set([
  'task_review',
  'manager_review',
  'environment_review',
])

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizedKey(key)
  return SENSITIVE_KEYS.has(normalized) || SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))
}

function sanitizeUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) {
    return value
  }

  try {
    const url = new URL(value)
    for (const key of Array.from(url.searchParams.keys())) {
      const normalized = normalizedKey(key)
      if (SENSITIVE_URL_PARAM_PARTS.some((part) => normalized.includes(part))) {
        url.searchParams.delete(key)
      }
    }
    return url.toString()
  } catch {
    return value
  }
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item))
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}
    for (const [key, nestedValue] of Object.entries(value)) {
      if (isSensitiveKey(key)) continue
      output[key] = sanitize(nestedValue)
    }
    return output
  }

  if (typeof value === 'string') {
    return sanitizeUrl(value)
  }

  return value
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function inferDisputeReviewType(caseFile: {
  dispute_review_type?: string | null
  dispute_claim_snapshot: Record<string, unknown>
}): string {
  const claim = asRecord(caseFile.dispute_claim_snapshot)
  const candidates = [
    caseFile.dispute_review_type,
    claim['dispute_review_type'],
    claim['review_type'],
  ]

  for (const value of candidates) {
    const normalized = clean(value).toLowerCase().replaceAll('-', '_')
    if (ALLOWED_DISPUTE_REVIEW_TYPES.has(normalized)) return normalized
    if (normalized.includes('environment') || normalized.includes('moi_truong')) {
      return 'environment_review'
    }
    if (
      normalized.includes('manager') ||
      normalized.includes('assigner') ||
      normalized.includes('reverse_review')
    ) {
      return 'manager_review'
    }
  }

  return 'task_review'
}

function organizationContext(caseFile: {
  organization_context_snapshot?: Record<string, unknown> | null
  task_snapshot: Record<string, unknown>
}): Record<string, unknown> {
  const explicit = asRecord(caseFile.organization_context_snapshot)
  if (Object.keys(explicit).length > 0) return explicit

  const nested = asRecord(caseFile.task_snapshot['organization'])
  if (Object.keys(nested).length > 0) return nested

  const organizationId = caseFile.task_snapshot['organization_id'] ?? caseFile.task_snapshot['org_id']
  return clean(organizationId) ? { id: organizationId } : {}
}

function projectContext(caseFile: {
  project_context_snapshot?: Record<string, unknown> | null
  task_snapshot: Record<string, unknown>
}): Record<string, unknown> {
  const explicit = asRecord(caseFile.project_context_snapshot)
  if (Object.keys(explicit).length > 0) return explicit

  const nested = asRecord(caseFile.task_snapshot['project'])
  if (Object.keys(nested).length > 0) return nested

  const projectId = caseFile.task_snapshot['project_id']
  const project: Record<string, unknown> = clean(projectId) ? { id: projectId } : {}
  const sprintId = caseFile.task_snapshot['project_sprint_id'] ?? caseFile.task_snapshot['sprint_id']
  if (Object.keys(project).length > 0 && clean(sprintId)) {
    project['sprint_id'] = sprintId
  }
  return project
}

function contextList(
  explicitValue: unknown,
  taskSnapshot: Record<string, unknown>,
  fallbackKeys: string[]
): unknown[] {
  if (Array.isArray(explicitValue)) return explicitValue
  for (const key of fallbackKeys) {
    const value = taskSnapshot[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function partyContext(value: Record<string, unknown>): Record<string, unknown> {
  const context = { ...asRecord(value) }
  if (!Object.hasOwn(context, 'profile')) {
    context['profile'] = asRecord(context['profile_snapshot'] ?? context['public_profile'])
  }
  if (!Object.hasOwn(context, 'work_schedule')) {
    context['work_schedule'] = asArray(
      context['schedule'] ?? context['availability'] ?? context['workload']
    )
  }
  if (!Object.hasOwn(context, 'task_history')) {
    context['task_history'] = asArray(context['work_history'])
  }
  return context
}

function addMissingData(missingData: Record<string, unknown>[], key: string): void {
  if (!missingData.some((item) => item['key'] === key)) {
    missingData.push({ key })
  }
}

function contextualMissingData(input: {
  missingData: Record<string, unknown>[]
  organization: Record<string, unknown>
  project: Record<string, unknown>
  relatedProjectTasks: unknown[]
  sprintPeerTasks: unknown[]
  reviewerContext: Record<string, unknown>
  revieweeContext: Record<string, unknown>
}): Record<string, unknown>[] {
  const missingData = input.missingData.map((item) => ({ ...item }))

  if (Object.keys(input.organization).length === 0) addMissingData(missingData, 'organization_context')
  if (Object.keys(input.project).length === 0) addMissingData(missingData, 'project_context')
  if (input.relatedProjectTasks.length === 0) addMissingData(missingData, 'related_project_tasks')
  if (input.sprintPeerTasks.length === 0) addMissingData(missingData, 'sprint_peer_tasks')
  if (Object.keys(asRecord(input.reviewerContext['profile'])).length === 0) {
    addMissingData(missingData, 'reviewer_profile_context')
  }
  if (asArray(input.reviewerContext['work_schedule']).length === 0) {
    addMissingData(missingData, 'reviewer_work_schedule_context')
  }
  if (Object.keys(asRecord(input.revieweeContext['profile'])).length === 0) {
    addMissingData(missingData, 'reviewee_profile_context')
  }
  if (asArray(input.revieweeContext['work_schedule']).length === 0) {
    addMissingData(missingData, 'reviewee_work_schedule_context')
  }

  return missingData
}

export function buildAiDisputePayload(caseFile: {
  id: string
  dispute_id: string
  case_version?: number | string | null
  dispute_review_type?: string | null
  organization_context_snapshot?: Record<string, unknown> | null
  project_context_snapshot?: Record<string, unknown> | null
  task_snapshot: Record<string, unknown>
  related_project_tasks_snapshot?: Record<string, unknown>[] | null
  sprint_peer_tasks_snapshot?: Record<string, unknown>[] | null
  required_skills_snapshot: Record<string, unknown>[]
  acceptance_criteria_snapshot: Record<string, unknown>
  assignment_snapshot: Record<string, unknown>
  submission_snapshot: Record<string, unknown>
  review_snapshot: Record<string, unknown>
  skill_reviews_snapshot: Record<string, unknown>[]
  evidences_snapshot: Record<string, unknown>[]
  self_assessment_snapshot: Record<string, unknown>
  task_comments_snapshot: Record<string, unknown>[]
  task_history_snapshot: Record<string, unknown>[]
  dispute_claim_snapshot: Record<string, unknown>
  reviewer_context_snapshot: Record<string, unknown>
  reviewee_profile_context_snapshot: Record<string, unknown>
  completeness_score: number
  missing_data: Record<string, unknown>[]
}) {
  const caseVersion =
    caseFile.case_version === undefined || caseFile.case_version === null
      ? null
      : Number(caseFile.case_version)
  const organization = organizationContext(caseFile)
  const project = projectContext(caseFile)
  const relatedProjectTasks = contextList(
    caseFile.related_project_tasks_snapshot,
    caseFile.task_snapshot,
    ['related_project_tasks', 'related_tasks']
  )
  const sprintPeerTasks = contextList(caseFile.sprint_peer_tasks_snapshot, caseFile.task_snapshot, [
    'sprint_peer_tasks',
    'sprint_tasks',
  ])
  const reviewerContext = partyContext(caseFile.reviewer_context_snapshot)
  const revieweeContext = partyContext(caseFile.reviewee_profile_context_snapshot)
  const missingData = contextualMissingData({
    missingData: caseFile.missing_data,
    organization,
    project,
    relatedProjectTasks,
    sprintPeerTasks,
    reviewerContext,
    revieweeContext,
  })

  return {
    schema_version: 'suar_ai_dispute_package_v1',
    source_system: 'suar',
    workflow_type: 'review_session_dispute',
    dispute_review_type: inferDisputeReviewType(caseFile),
    case_id: caseFile.dispute_id,
    review_dispute_id: caseFile.dispute_id,
    case_file_id: caseFile.id,
    case_version: Number.isFinite(caseVersion) ? caseVersion : null,
    suar_identifiers: {
      review_dispute_id: caseFile.dispute_id,
      case_file_id: caseFile.id,
      case_version: Number.isFinite(caseVersion) ? caseVersion : null,
    },
    provenance: {
      primary_table: 'review_dispute_case_files',
      primary_id: caseFile.id,
      related_tables: [
        'review_disputes',
        'tasks',
        'task_assignments',
        'task_submissions',
        'review_sessions',
        'skill_reviews',
        'review_dispute_evidences',
        'organizations',
        'projects',
        'project_sprints',
        'user_profile_snapshots',
        'user_work_history',
      ],
    },
    organization: sanitize(organization) as Record<string, unknown>,
    project: sanitize(project) as Record<string, unknown>,
    task: sanitize(caseFile.task_snapshot) as Record<string, unknown>,
    related_project_tasks: sanitize(relatedProjectTasks) as Record<string, unknown>[],
    sprint_peer_tasks: sanitize(sprintPeerTasks) as Record<string, unknown>[],
    required_skills: sanitize(caseFile.required_skills_snapshot) as Record<string, unknown>[],
    acceptance_criteria: sanitize(caseFile.acceptance_criteria_snapshot) as Record<string, unknown>,
    assignment: sanitize(caseFile.assignment_snapshot) as Record<string, unknown>,
    submission: sanitize(caseFile.submission_snapshot) as Record<string, unknown>,
    review: sanitize(caseFile.review_snapshot) as Record<string, unknown>,
    skill_reviews: sanitize(caseFile.skill_reviews_snapshot) as Record<string, unknown>[],
    evidences: sanitize(caseFile.evidences_snapshot) as Record<string, unknown>[],
    self_assessment: sanitize(caseFile.self_assessment_snapshot) as Record<string, unknown>,
    comments: sanitize(caseFile.task_comments_snapshot) as Record<string, unknown>[],
    task_history: sanitize(caseFile.task_history_snapshot) as Record<string, unknown>[],
    dispute_claim: sanitize(caseFile.dispute_claim_snapshot) as Record<string, unknown>,
  }
}
