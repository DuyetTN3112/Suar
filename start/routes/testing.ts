import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { middleware } from '../kernel.js'

import { computeAuditEventHash } from '#modules/audit/domain/audit_event_hash'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { reviewPublicApi } from '#modules/reviews/public_contracts/review_public_api'
import { listCanonicalProficiencyLevelOptions } from '#modules/skills/public_contracts/proficiency_framework'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
  TaskAssignmentFactory,
  ProjectMemberFactory,
  TaskApplicationFactory,
  ReviewSessionFactory,
  ReviewSessionReviewerAssignmentFactory,
  SkillFactory,
  SkillReviewFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

type TestingSkillImportance = 'low' | 'medium' | 'high' | 'critical'
type TestingAuditSurface = 'system' | 'organization' | 'user'
type TestingAuditScope = {
  surface: TestingAuditSurface
  user_id: string | null
  organization_id: string | null
}
type TestingAuditScopeInput = {
  surface?: unknown
  userId?: unknown
  user_id?: unknown
  organizationId?: unknown
  organization_id?: unknown
}
type TestingRoleSkillInput = {
  skill_name: string
  category_code: string
  importance: TestingSkillImportance
}

type CleanupStats = Record<string, number>
type RawRowsResult<T> = {
  rows: T[]
}
type RawWhereBuilder = {
  orWhereRaw: (sql: string, bindings: readonly unknown[]) => RawWhereBuilder
}

const columnExistsCache = new Map<string, boolean>()
const TESTING_AUDIT_SURFACES = new Set<TestingAuditSurface>(['system', 'organization', 'user'])

function readOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readBooleanInput(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

function readValueMap(
  value: unknown,
  fallback: Record<string, unknown>
): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fallback
}

function toTestingAuditSurface(value: unknown): TestingAuditSurface | null {
  if (typeof value !== 'string') {
    return null
  }

  return TESTING_AUDIT_SURFACES.has(value as TestingAuditSurface)
    ? (value as TestingAuditSurface)
    : null
}

function normalizeTestingAuditScope(scope: TestingAuditScopeInput): TestingAuditScope | null {
  const surface = toTestingAuditSurface(scope.surface)
  if (!surface) {
    return null
  }

  return {
    surface,
    user_id: readOptionalString(scope.userId ?? scope.user_id),
    organization_id: readOptionalString(scope.organizationId ?? scope.organization_id),
  }
}

function readTestingAuditScopes(value: unknown): TestingAuditScope[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((scope) =>
      scope && typeof scope === 'object'
        ? normalizeTestingAuditScope(scope as TestingAuditScopeInput)
        : null
    )
    .filter((scope): scope is TestingAuditScope => Boolean(scope))
}

function uniqueTestingAuditScopes(scopes: TestingAuditScope[]): TestingAuditScope[] {
  const seen = new Set<string>()
  const uniqueScopes: TestingAuditScope[] = []

  for (const scope of scopes) {
    const key = `${scope.surface}:${scope.user_id ?? ''}:${scope.organization_id ?? ''}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    uniqueScopes.push(scope)
  }

  return uniqueScopes
}

async function findOrCreateTestingAuditUserByEmail(
  email: string,
  seedKey: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = (await db
    .from('users')
    .whereRaw('lower(email) = ?', [normalizedEmail])
    .select('id')
    .first()) as { id?: string } | undefined

  if (existing?.id) {
    return existing.id
  }

  const usernameSuffix = seedKey.replace(/[^a-z0-9]/gi, '_')
  const user = await UserFactory.create({
    email: normalizedEmail,
    username: `audit_user_${usernameSuffix}`,
  })
  return user.id
}

async function getPreviousTestingAuditHash(): Promise<string | null> {
  if (!(await columnExists('audit_events', 'event_hash'))) {
    return null
  }

  const previous = (await db
    .from('audit_events')
    .whereNotNull('event_hash')
    .orderBy('occurred_at', 'desc')
    .orderBy('id', 'desc')
    .select('event_hash')
    .first()) as { event_hash?: string | null } | undefined

  return previous?.event_hash ?? null
}

function tableNameWithoutSchema(table: string): string {
  return table.split('.').at(-1) ?? table
}

function isRawRowsResult<T>(value: unknown): value is RawRowsResult<T> {
  return typeof value === 'object' && value !== null && 'rows' in value && Array.isArray(value.rows)
}

function readRawRows<T>(value: unknown): T[] {
  return isRawRowsResult<T>(value) ? value.rows : []
}

function addCleanupStat(stats: CleanupStats, table: string, count: unknown): void {
  const numericCount = Number(count ?? 0)
  if (!Number.isFinite(numericCount) || numericCount <= 0) {
    return
  }

  stats[table] = (stats[table] ?? 0) + numericCount
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function isCleanupToken(value: string): boolean {
  return (
    value.length >= 6 &&
    (value.includes('seed') ||
      value.includes('e2e') ||
      value.includes('@test.com') ||
      /^\d{10,}$/.test(value) ||
      /^\d{10,}[-.][a-z0-9-]+$/i.test(value))
  )
}

function collectCleanupTokens(input: unknown, tokens: Set<string> = new Set()): string[] {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const value = String(input)
    if (isCleanupToken(value)) {
      tokens.add(value)
    }
    return [...tokens]
  }

  if (typeof input === 'string') {
    const value = input.trim()
    if (isCleanupToken(value)) {
      tokens.add(value)
    }
    return [...tokens]
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectCleanupTokens(item, tokens)
    }
    return [...tokens]
  }

  if (input && typeof input === 'object') {
    for (const value of Object.values(input)) {
      collectCleanupTokens(value, tokens)
    }
  }

  return [...tokens]
}

async function tableExists(table: string): Promise<boolean> {
  const tableName = tableNameWithoutSchema(table)
  const exists = (await db
    .from('information_schema.tables')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .first()) as unknown

  return Boolean(exists)
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const tableName = tableNameWithoutSchema(table)
  const cacheKey = `${tableName}.${column}`
  const cached = columnExistsCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const exists = (await db
    .from('information_schema.columns')
    .where('table_schema', 'public')
    .where('table_name', tableName)
    .where('column_name', column)
    .first()) as unknown

  const result = Boolean(exists)
  columnExistsCache.set(cacheKey, result)
  return result
}

async function existingColumns(table: string, columns: readonly string[]): Promise<string[]> {
  const result: string[] = []
  for (const column of columns) {
    if (await columnExists(table, column)) {
      result.push(column)
    }
  }
  return result
}

async function selectIdsByTokens(
  table: string,
  columns: readonly string[],
  tokens: readonly string[]
): Promise<string[]> {
  if (tokens.length === 0 || !(await tableExists(table)) || !(await columnExists(table, 'id'))) {
    return []
  }

  const searchableColumns = await existingColumns(table, columns)
  if (searchableColumns.length === 0) {
    return []
  }

  const rows = (await db
    .from(table)
    .select('id')
    .where((query) => {
      const rawQuery = query as unknown as RawWhereBuilder
      for (const token of tokens) {
        const pattern = `%${token}%`
        for (const column of searchableColumns) {
          rawQuery.orWhereRaw('??::text ILIKE ?', [column, pattern])
        }
      }
    })) as { id: string }[]

  return unique(rows.map((row) => row.id))
}

async function selectIdsWhereIn(
  table: string,
  column: string,
  values: readonly string[]
): Promise<string[]> {
  if (
    values.length === 0 ||
    !(await tableExists(table)) ||
    !(await columnExists(table, 'id')) ||
    !(await columnExists(table, column))
  ) {
    return []
  }

  const rows = (await db
    .from(table)
    .select('id')
    .whereIn(column, [...values])) as { id: string }[]
  return unique(rows.map((row) => row.id))
}

async function selectValuesWhereIn(
  table: string,
  valueColumn: string,
  whereColumn: string,
  values: readonly string[]
): Promise<string[]> {
  if (
    values.length === 0 ||
    !(await tableExists(table)) ||
    !(await columnExists(table, valueColumn)) ||
    !(await columnExists(table, whereColumn))
  ) {
    return []
  }

  const rows = (await db
    .from(table)
    .select(valueColumn)
    .whereIn(whereColumn, [...values])) as Record<string, string | null>[]

  return unique(
    rows.map((row) => row[valueColumn]).filter((value): value is string => Boolean(value))
  )
}

async function deleteWhereIn(
  table: string,
  column: string,
  values: readonly string[],
  stats: CleanupStats
): Promise<void> {
  if (values.length === 0 || !(await tableExists(table)) || !(await columnExists(table, column))) {
    return
  }

  const deleted = await db
    .from(table)
    .whereIn(column, [...values])
    .delete()
  addCleanupStat(stats, table, deleted)
}

async function deleteByTokens(
  table: string,
  columns: readonly string[],
  tokens: readonly string[],
  stats: CleanupStats
): Promise<void> {
  if (tokens.length === 0 || !(await tableExists(table))) {
    return
  }

  const searchableColumns = await existingColumns(table, columns)
  if (searchableColumns.length === 0) {
    return
  }

  const deleted = await db
    .from(table)
    .where((query) => {
      const rawQuery = query as unknown as RawWhereBuilder
      for (const token of tokens) {
        const pattern = `%${token}%`
        for (const column of searchableColumns) {
          rawQuery.orWhereRaw('??::text ILIKE ?', [column, pattern])
        }
      }
    })
    .delete()

  addCleanupStat(stats, table, deleted)
}

async function cleanupTestingSeedData(tokens: readonly string[]): Promise<CleanupStats> {
  const stats: CleanupStats = {}

  const userIds = await selectIdsByTokens('users', ['email', 'username'], tokens)
  const skillIds = await selectIdsByTokens('skills', ['skill_name', 'skill_code'], tokens)

  const organizationIds = unique([
    ...(await selectIdsByTokens('organizations', ['name', 'slug', 'description'], tokens)),
    ...(await selectIdsWhereIn('organizations', 'owner_id', userIds)),
  ])
  const projectIds = unique([
    ...(await selectIdsByTokens('projects', ['name', 'slug', 'description'], tokens)),
    ...(await selectIdsWhereIn('projects', 'organization_id', organizationIds)),
    ...(await selectIdsWhereIn('projects', 'owner_id', userIds)),
    ...(await selectIdsWhereIn('projects', 'creator_id', userIds)),
    ...(await selectIdsWhereIn('projects', 'manager_id', userIds)),
  ])
  const sprintIds = unique([
    ...(await selectIdsByTokens('project_sprints', ['name', 'goal'], tokens)),
    ...(await selectIdsWhereIn('project_sprints', 'organization_id', organizationIds)),
    ...(await selectIdsWhereIn('project_sprints', 'project_id', projectIds)),
    ...(await selectIdsWhereIn('project_sprints', 'created_by', userIds)),
  ])
  const taskIds = unique([
    ...(await selectIdsByTokens('tasks', ['title', 'description'], tokens)),
    ...(await selectIdsWhereIn('tasks', 'organization_id', organizationIds)),
    ...(await selectIdsWhereIn('tasks', 'project_id', projectIds)),
    ...(await selectIdsWhereIn('tasks', 'project_sprint_id', sprintIds)),
    ...(await selectIdsWhereIn('tasks', 'creator_id', userIds)),
    ...(await selectIdsWhereIn('tasks', 'assigned_to', userIds)),
  ])
  const projectSkillIds = unique([
    ...(await selectIdsWhereIn('project_skills', 'project_id', projectIds)),
    ...(await selectIdsWhereIn('project_skills', 'skill_id', skillIds)),
  ])
  const projectSkillSkillIds = await selectValuesWhereIn(
    'project_skills',
    'skill_id',
    'id',
    projectSkillIds
  )
  const allSkillIds = unique([...skillIds, ...projectSkillSkillIds])
  const projectRoleIds = await selectIdsWhereIn(
    'project_professional_roles',
    'project_id',
    projectIds
  )
  const taskAssignmentIds = unique([
    ...(await selectIdsWhereIn('task_assignments', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('task_assignments', 'assignee_id', userIds)),
    ...(await selectIdsWhereIn('task_assignments', 'assigned_by', userIds)),
  ])
  const reviewSessionIds = unique([
    ...(await selectIdsWhereIn('review_sessions', 'task_assignment_id', taskAssignmentIds)),
    ...(await selectIdsWhereIn('review_sessions', 'reviewee_id', userIds)),
    ...(await selectIdsWhereIn('review_sessions', 'creator_reviewer_id', userIds)),
  ])
  const skillReviewIds = unique([
    ...(await selectIdsWhereIn('skill_reviews', 'review_session_id', reviewSessionIds)),
    ...(await selectIdsWhereIn('skill_reviews', 'reviewer_id', userIds)),
    ...(await selectIdsWhereIn('skill_reviews', 'reviewee_id', userIds)),
    ...(await selectIdsWhereIn('skill_reviews', 'skill_id', allSkillIds)),
  ])
  const reviewEvidenceIds = unique([
    ...(await selectIdsWhereIn('review_evidences', 'review_session_id', reviewSessionIds)),
    ...(await selectIdsWhereIn('review_evidences', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('review_evidences', 'submitted_by', userIds)),
  ])
  const disputeIds = unique([
    ...(await selectIdsWhereIn('review_disputes', 'review_session_id', reviewSessionIds)),
    ...(await selectIdsWhereIn('review_disputes', 'task_assignment_id', taskAssignmentIds)),
    ...(await selectIdsWhereIn('review_disputes', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('review_disputes', 'reviewee_id', userIds)),
    ...(await selectIdsWhereIn('review_disputes', 'opened_by', userIds)),
  ])
  const aiEvaluationIds = await selectIdsWhereIn('ai_dispute_evaluations', 'dispute_id', disputeIds)
  const taskSubmissionIds = unique([
    ...(await selectIdsWhereIn('task_submissions', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('task_submissions', 'submitted_by', userIds)),
  ])
  const taskCommentIds = unique([
    ...(await selectIdsWhereIn('task_comments', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('task_comments', 'user_id', userIds)),
    ...(await selectIdsWhereIn('task_comments', 'author_id', userIds)),
  ])
  const taskReviewWorkflowIds = unique([
    ...(await selectIdsWhereIn('task_review_workflows', 'task_id', taskIds)),
    ...(await selectIdsWhereIn('task_review_workflows', 'project_id', projectIds)),
    ...(await selectIdsWhereIn('task_review_workflows', 'organization_id', organizationIds)),
    ...(await selectIdsWhereIn('task_review_workflows', 'reviewee_id', userIds)),
  ])
  const sprintReviewPackageIds = unique([
    ...(await selectIdsWhereIn('sprint_review_packages', 'sprint_id', sprintIds)),
    ...(await selectIdsWhereIn('sprint_review_packages', 'project_id', projectIds)),
    ...(await selectIdsWhereIn('sprint_review_packages', 'organization_id', organizationIds)),
  ])
  const sprintReverseWorkflowIds = unique([
    ...(await selectIdsWhereIn('sprint_reverse_review_workflows', 'sprint_id', sprintIds)),
    ...(await selectIdsWhereIn('sprint_reverse_review_workflows', 'project_id', projectIds)),
    ...(await selectIdsWhereIn(
      'sprint_reverse_review_workflows',
      'organization_id',
      organizationIds
    )),
    ...(await selectIdsWhereIn('sprint_reverse_review_workflows', 'reviewer_id', userIds)),
    ...(await selectIdsWhereIn('sprint_reverse_review_workflows', 'target_user_id', userIds)),
    ...(await selectIdsWhereIn('sprint_reverse_review_workflows', 'responder_id', userIds)),
  ])

  await deleteByTokens(
    'audit_events',
    ['action', 'entity_type', 'entity_id', 'old_values', 'new_values', 'user_agent'],
    tokens,
    stats
  )
  await deleteByTokens('notifications', ['title', 'message', 'body', 'metadata'], tokens, stats)
  await deleteByTokens(
    'user_activity_events',
    ['action', 'entity_type', 'entity_id', 'metadata', 'user_agent'],
    tokens,
    stats
  )
  await deleteByTokens('error_events', ['message', 'context', 'user_agent'], tokens, stats)

  await deleteWhereIn('ai_dispute_feedback', 'evaluation_id', aiEvaluationIds, stats)
  await deleteWhereIn('ai_dispute_evaluations', 'id', aiEvaluationIds, stats)
  await deleteWhereIn('ai_dispute_evaluations', 'dispute_id', disputeIds, stats)
  await deleteWhereIn('flagged_reviews', 'review_session_id', reviewSessionIds, stats)
  await deleteWhereIn('flagged_reviews', 'task_id', taskIds, stats)
  await deleteWhereIn('sprint_review_dispute_comments', 'dispute_id', disputeIds, stats)
  await deleteWhereIn('sprint_review_dispute_comments', 'author_id', userIds, stats)
  await deleteWhereIn('sprint_review_disputes', 'sprint_id', sprintIds, stats)
  await deleteWhereIn('sprint_review_disputes', 'task_id', taskIds, stats)
  await deleteWhereIn(
    'sprint_reverse_review_messages',
    'workflow_id',
    sprintReverseWorkflowIds,
    stats
  )
  await deleteWhereIn('sprint_reverse_review_messages', 'author_id', userIds, stats)
  await deleteWhereIn('sprint_reverse_review_workflows', 'id', sprintReverseWorkflowIds, stats)
  await deleteWhereIn('sprint_environment_reviews', 'package_id', sprintReviewPackageIds, stats)
  await deleteWhereIn('sprint_manager_reviews', 'package_id', sprintReviewPackageIds, stats)
  await deleteWhereIn('sprint_review_packages', 'id', sprintReviewPackageIds, stats)
  await deleteWhereIn('project_sprints', 'id', sprintIds, stats)
  await deleteWhereIn('review_dispute_case_files', 'dispute_id', disputeIds, stats)
  await deleteWhereIn('review_dispute_evidences', 'dispute_id', disputeIds, stats)
  await deleteWhereIn('review_dispute_comments', 'dispute_id', disputeIds, stats)
  await deleteWhereIn('review_disputes', 'id', disputeIds, stats)
  await deleteWhereIn('reverse_review_target_stats', 'target_user_id', userIds, stats)
  await deleteWhereIn('reverse_reviews', 'reviewer_id', userIds, stats)
  await deleteWhereIn('reverse_reviews', 'target_user_id', userIds, stats)
  await deleteWhereIn('skill_review_evidence_links', 'skill_review_id', skillReviewIds, stats)
  await deleteWhereIn('skill_review_evidence_links', 'review_evidence_id', reviewEvidenceIds, stats)
  await deleteWhereIn('skill_reviews', 'id', skillReviewIds, stats)
  await deleteWhereIn('review_evidences', 'id', reviewEvidenceIds, stats)
  await deleteWhereIn(
    'review_session_reviewer_assignments',
    'review_session_id',
    reviewSessionIds,
    stats
  )
  await deleteWhereIn('review_session_reviewer_assignments', 'reviewer_id', userIds, stats)
  await deleteWhereIn('task_self_assessments', 'task_id', taskIds, stats)
  await deleteWhereIn('task_self_assessments', 'user_id', userIds, stats)
  await deleteWhereIn('review_sessions', 'id', reviewSessionIds, stats)
  await deleteWhereIn('user_profile_snapshots', 'user_id', userIds, stats)
  await deleteWhereIn('user_work_history', 'user_id', userIds, stats)
  await deleteWhereIn('user_work_history', 'task_id', taskIds, stats)
  await deleteWhereIn('user_domain_expertise', 'user_id', userIds, stats)
  await deleteWhereIn('user_performance_stats', 'user_id', userIds, stats)
  await deleteWhereIn('user_skills', 'user_id', userIds, stats)
  await deleteWhereIn('user_skills', 'skill_id', allSkillIds, stats)
  await deleteWhereIn('recruiter_bookmarks', 'recruiter_id', userIds, stats)
  await deleteWhereIn('recruiter_bookmarks', 'talent_id', userIds, stats)
  await deleteWhereIn('user_subscriptions', 'user_id', userIds, stats)
  await deleteWhereIn('messages', 'sender_id', userIds, stats)
  await deleteWhereIn('messages', 'recipient_id', userIds, stats)
  await deleteWhereIn('task_submission_evidences', 'task_submission_id', taskSubmissionIds, stats)
  await deleteWhereIn('task_submission_evidences', 'submitted_by', userIds, stats)
  await deleteWhereIn('task_submissions', 'id', taskSubmissionIds, stats)
  await deleteWhereIn('task_comment_mentions', 'task_comment_id', taskCommentIds, stats)
  await deleteWhereIn('task_comment_mentions', 'mentioned_user_id', userIds, stats)
  await deleteWhereIn('task_comments', 'id', taskCommentIds, stats)
  await deleteWhereIn('task_attachments', 'task_id', taskIds, stats)
  await deleteWhereIn('task_attachments', 'uploaded_by', userIds, stats)
  await deleteWhereIn('task_assignment_snapshots', 'task_assignment_id', taskAssignmentIds, stats)
  await deleteWhereIn('task_requirement_version_items', 'task_id', taskIds, stats)
  await deleteWhereIn('task_requirement_versions', 'task_id', taskIds, stats)
  await deleteWhereIn('task_required_skills', 'task_id', taskIds, stats)
  await deleteWhereIn('task_required_skills', 'skill_id', allSkillIds, stats)
  await deleteWhereIn('task_versions', 'task_id', taskIds, stats)
  await deleteWhereIn('task_review_messages', 'workflow_id', taskReviewWorkflowIds, stats)
  await deleteWhereIn('task_review_reviewers', 'workflow_id', taskReviewWorkflowIds, stats)
  await deleteWhereIn('task_review_workflows', 'id', taskReviewWorkflowIds, stats)
  await deleteWhereIn('task_assignments', 'id', taskAssignmentIds, stats)
  await deleteWhereIn('task_applications', 'task_id', taskIds, stats)
  await deleteWhereIn('task_applications', 'applicant_id', userIds, stats)
  await deleteWhereIn('project_attachments', 'project_id', projectIds, stats)
  await deleteWhereIn('project_attachments', 'uploaded_by', userIds, stats)
  await deleteWhereIn('project_members', 'project_id', projectIds, stats)
  await deleteWhereIn('project_members', 'user_id', userIds, stats)
  await deleteWhereIn('marketplace_applications', 'task_id', taskIds, stats)
  await deleteWhereIn('marketplace_applications', 'applicant_id', userIds, stats)
  await deleteWhereIn('task_workflow_transitions', 'task_id', taskIds, stats)
  await deleteWhereIn('tasks', 'id', taskIds, stats)
  await deleteWhereIn('task_statuses', 'organization_id', organizationIds, stats)
  await deleteWhereIn(
    'project_professional_role_skills',
    'project_professional_role_id',
    projectRoleIds,
    stats
  )
  await deleteWhereIn(
    'project_professional_role_skills',
    'project_skill_id',
    projectSkillIds,
    stats
  )
  await deleteWhereIn('project_professional_roles', 'id', projectRoleIds, stats)
  await deleteWhereIn('project_skills', 'id', projectSkillIds, stats)
  await deleteWhereIn('organization_users', 'organization_id', organizationIds, stats)
  await deleteWhereIn('organization_users', 'user_id', userIds, stats)
  await deleteWhereIn('projects', 'id', projectIds, stats)
  await deleteWhereIn('organizations', 'id', organizationIds, stats)
  await deleteWhereIn('user_oauth_providers', 'user_id', userIds, stats)
  await deleteWhereIn('remember_me_tokens', 'tokenable_id', userIds, stats)
  await deleteWhereIn('skills', 'id', allSkillIds, stats)
  await deleteWhereIn('users', 'id', userIds, stats)

  return stats
}

async function ensureTestingCanonicalProficiencyLevels() {
  let scale = (await db
    .from('proficiency_scales')
    .where('is_active', true)
    .select('id')
    .first()) as { id: string } | null

  if (!scale?.id) {
    const existingScale = (await db
      .from('proficiency_levels')
      .select('scale_id as id')
      .first()) as { id: string } | null

    if (existingScale?.id) {
      await db.from('proficiency_scales').where('id', existingScale.id).update({ is_active: true })
      scale = existingScale
    } else {
      const scaleId = testId()
      await db.table('proficiency_scales').insert({
        id: scaleId,
        code: `testing-canonical-${scaleId.slice(0, 8)}`,
        name: 'Testing Canonical L0-L14',
        version: 1,
        is_active: true,
      })
      scale = { id: scaleId }
    }
  }

  const levelsByCode = new Map<string, string>()
  for (const option of listCanonicalProficiencyLevelOptions()) {
    const existingByCode = (await db
      .from('proficiency_levels')
      .where('code', option.value)
      .select('id')
      .first()) as { id: string } | null

    if (existingByCode?.id) {
      levelsByCode.set(option.value, existingByCode.id)
      continue
    }

    const existingByOrdinal = (await db
      .from('proficiency_levels')
      .where('ordinal', option.order)
      .select('id')
      .first()) as { id: string } | null

    if (existingByOrdinal?.id) {
      levelsByCode.set(option.value, existingByOrdinal.id)
      continue
    }

    const levelId = testId()
    await db.table('proficiency_levels').insert({
      id: levelId,
      scale_id: scale.id,
      ordinal: option.order,
      code: option.value,
      display_name: option.label,
      short_name: option.code,
      normalized_value: Number(((option.order - 1) / 14).toFixed(2)),
      sort_order: option.order,
    })
    levelsByCode.set(option.value, levelId)
  }

  return levelsByCode
}

router
  .group(() => {
    router.get('/auth-state', async ({ auth, response, session }) => {
      await auth.check()

      response.json(
        wrapApiV1Data({
          authenticated: !!auth.user,
          email: auth.user?.email ?? null,
          currentOrganizationId: auth.user?.current_organization_id ?? null,
          sessionOrganizationId:
            (session.get('current_organization_id') as string | undefined) ?? null,
          systemRole: auth.user?.system_role ?? null,
        })
      )
    })

    router.post('/seed-e2e', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const seedKey = `${timestamp}-${nonce}`

      const talent = await UserFactory.create({
        email: `seed-talent-${seedKey}@test.com`,
        username: `seed_talent_${seedKey.replace(/-/g, '_')}`,
      })

      await talent
        .merge({
          bio: 'Seeded talent profile for Playwright recruiter bookmark flows',
          is_external_contributor: true,
          external_contributor_completed_tasks_count: 3,
          profile_settings: {
            is_searchable: true,
            show_contact_info: true,
            show_organizations: true,
            show_projects: true,
            show_spider_chart: true,
            show_technical_skills: true,
            custom_headline: 'Seeded E2E Talent',
            preferred_job_types: ['full_time'],
            preferred_locations: ['remote'],
            min_salary_expectation: null,
            salary_currency: 'USD',
            available_from: null,
          },
        })
        .save()

      response.json(
        wrapApiV1Data({
          talentId: talent.id,
          talentEmail: talent.email,
          timestamp,
        })
      )
    })

    router.post('/seed-task-submission-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const seedKey = `${timestamp}-${nonce}`
      const assigneeEmail = `seed-assignee-${seedKey}@test.com`
      const outsiderEmail = `seed-outsider-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        { name: `Seed Task Org ${seedKey}`, slug: `seed-task-org-${seedKey}` },
        { email: assigneeEmail, username: `seed_assignee_${seedKey.replace(/-/g, '_')}` }
      )

      const outsider = await UserFactory.create({
        email: outsiderEmail,
        username: `seed_outsider_${seedKey.replace(/-/g, '_')}`,
      })

      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: outsider.id,
        org_role: 'org_member',
        status: 'approved',
      })
      outsider.current_organization_id = org.id
      await outsider.save()

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: `Seed Task Project ${seedKey}`,
      })

      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: outsider.id,
        project_role: 'project_member',
      })

      const task = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: owner.id,
        project_id: project.id,
        status: 'in_progress',
        title: `Seed Task ${seedKey}`,
        description: 'Seeded for E2E task submission flow',
      })

      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: owner.id,
        assigned_by: owner.id,
        assignment_status: 'active',
        assignment_type: 'member',
      })

      response.json(
        wrapApiV1Data({
          organizationId: org.id,
          taskId: task.id,
          assigneeEmail,
          outsiderEmail,
          assigneeId: owner.id,
          timestamp,
        })
      )
    })

    router.post('/seed-project-member-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const demoNames = Boolean(request.input('demoNames', false))
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-owner-${seedKey}@test.com`
      const memberEmail = `seed-member-${seedKey}@test.com`
      const candidateEmail = `seed-candidate-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        {
          name: demoNames ? 'Tổ chức Demo' : `Seed Member Org ${seedKey}`,
          slug: `seed-member-org-${seedKey}`,
        },
        {
          email: ownerEmail,
          username: demoNames ? `demo_owner_${nonce}` : `seed_owner_${seedKey.replace(/-/g, '_')}`,
        }
      )

      const member = await UserFactory.create({
        email: memberEmail,
        username: demoNames ? `demo_member_${nonce}` : `seed_member_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })

      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: member.id,
        org_role: 'org_member',
        status: 'approved',
      })

      const candidate = await UserFactory.create({
        email: candidateEmail,
        username: demoNames
          ? `demo_candidate_${nonce}`
          : `seed_candidate_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })

      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: candidate.id,
        org_role: 'org_member',
        status: 'approved',
      })

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: demoNames ? 'Checkout QA' : `Seed Project ${seedKey}`,
      })

      const projectRole = await skillPublicApi.createCustomProjectRole({
        projectId: project.id,
        code: 'qa_engineer',
        name: 'QA Engineer',
        description: demoNames
          ? 'Checklist, evidence, release.'
          : 'Owns test checklist, evidence, and release confidence.',
        createdBy: owner.id,
      })

      const roleSkillInputs: TestingRoleSkillInput[] = demoNames
        ? [
            {
              skill_name: 'TypeScript QA Automation',
              category_code: 'technology',
              importance: 'high',
            },
            { skill_name: 'QA Strategy', category_code: 'engineering', importance: 'critical' },
            { skill_name: 'Clear Communication', category_code: 'soft_skill', importance: 'high' },
            { skill_name: 'Release Ownership', category_code: 'delivery', importance: 'critical' },
          ]
        : [
            {
              skill_name: `Seed Technology ${seedKey}`,
              category_code: 'technology',
              importance: 'critical',
            },
            {
              skill_name: `Seed Engineering ${seedKey}`,
              category_code: 'engineering',
              importance: 'high',
            },
            {
              skill_name: `Seed Soft Skill ${seedKey}`,
              category_code: 'soft_skill',
              importance: 'high',
            },
            {
              skill_name: `Seed Delivery ${seedKey}`,
              category_code: 'delivery',
              importance: 'critical',
            },
          ]

      const levelsByCode = await ensureTestingCanonicalProficiencyLevels()
      const minimumLevelId = levelsByCode.get('l3') ?? null
      const targetLevelId = levelsByCode.get('l7') ?? null
      const assessmentCeilingLevelId = targetLevelId
      const roleSkills = []
      for (const [index, roleSkillInput] of roleSkillInputs.entries()) {
        const skill = await SkillFactory.create({
          skill_name: roleSkillInput.skill_name,
          category_code: roleSkillInput.category_code,
          sort_order: index + 1,
        })
        const projectSkill = await skillPublicApi.addSkillToProject({
          projectId: project.id,
          skillId: skill.id,
          addedBy: owner.id,
        })
        await skillPublicApi.addSkillToProjectRole({
          projectProfessionalRoleId: projectRole.id,
          projectSkillId: projectSkill.id,
          minimumLevelId,
          targetLevelId,
          assessmentCeilingLevelId,
          isMandatory: index < 3,
          importance: roleSkillInput.importance,
          weight: index < 3 ? 1 : 0.75,
          sortOrder: index + 1,
          notes: null,
        })
        roleSkills.push(skill)
      }

      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: member.id,
        project_role: 'project_member',
        project_professional_role_id: projectRole.id,
      })

      const task = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        project_id: project.id,
        status: 'todo',
        title: demoNames ? 'Verify checkout release' : `Seed Task ${seedKey}`,
      })

      response.status(201).json(
        wrapApiV1Data({
          organizationId: org.id,
          projectId: project.id,
          taskId: task.id,
          ownerEmail,
          memberEmail,
          candidateEmail,
          ownerId: owner.id,
          memberId: member.id,
          candidateId: candidate.id,
          skills: roleSkills.map((skill) => ({
            id: skill.id,
            name: skill.skill_name,
            categoryCode: skill.category_code,
          })),
          timestamp,
        })
      )
    })

    router.post('/seed-task-review-board-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-review-owner-${seedKey}@test.com`
      const workerEmail = `seed-review-worker-${seedKey}@test.com`
      const managerEmail = `seed-review-manager-${seedKey}@test.com`
      const peerEmail = `seed-review-peer-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        { name: `Review Demo Org ${seedKey}`, slug: `review-demo-org-${seedKey}` },
        { email: ownerEmail, username: `review_owner_${seedKey.replace(/-/g, '_')}` }
      )
      const worker = await UserFactory.create({
        email: workerEmail,
        username: `review_worker_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })
      const manager = await UserFactory.create({
        email: managerEmail,
        username: `review_manager_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })
      const peer = await UserFactory.create({
        email: peerEmail,
        username: `review_peer_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })

      for (const user of [worker, manager, peer]) {
        await OrganizationUserFactory.create({
          organization_id: org.id,
          user_id: user.id,
          org_role: 'org_member',
          status: 'approved',
        })
      }

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: `Review Board Project ${seedKey}`,
      })

      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: manager.id,
        project_role: 'project_manager',
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: worker.id,
        project_role: 'project_member',
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: peer.id,
        project_role: 'project_member',
      })

      const workerTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: worker.id,
        project_id: project.id,
        status: 'done',
        title: 'Review checkout evidence package',
        description: 'Task done by worker. Manager and peer must review before profile update.',
      })
      await TaskAssignmentFactory.create({
        task_id: workerTask.id,
        assignee_id: worker.id,
        assigned_by: owner.id,
        assignment_status: 'completed',
        assignment_type: 'member',
      })

      const ownerTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: owner.id,
        project_id: project.id,
        status: 'done',
        title: 'Owner done task remains visible',
        description: 'Own done task should also appear in review board.',
      })
      await TaskAssignmentFactory.create({
        task_id: ownerTask.id,
        assignee_id: owner.id,
        assigned_by: owner.id,
        assignment_status: 'completed',
        assignment_type: 'member',
      })

      response.status(201).json(
        wrapApiV1Data({
          organizationId: org.id,
          projectId: project.id,
          ownerEmail,
          workerEmail,
          managerEmail,
          peerEmail,
          ownerId: owner.id,
          workerId: worker.id,
          managerId: manager.id,
          peerId: peer.id,
          workerTaskId: workerTask.id,
          ownerTaskId: ownerTask.id,
          timestamp,
        })
      )
    })

    router.post('/seed-task-create-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const withSecondProjectTask = request.input('withSecondProjectTask', false) === true
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-task-create-owner-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        { name: `Seed Task Create Org ${seedKey}`, slug: `seed-task-create-org-${seedKey}` },
        { email: ownerEmail, username: `seed_task_create_owner_${seedKey.replace(/-/g, '_')}` }
      )
      await owner.merge({ current_organization_id: org.id }).save()
      await db.transaction(async (trx) => {
        await taskPublicApi.seedDefaultStatuses(org.id, trx)
      })

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: `Seed Task Create Project ${seedKey}`,
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })
      const projectTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: owner.id,
        project_id: project.id,
        status: 'todo',
        title: `Seed Scope Project A Task ${seedKey}`,
        description: 'Seeded for org-wide task scope E2E',
      })

      let secondProject = null
      let secondProjectTask = null
      if (withSecondProjectTask) {
        secondProject = await ProjectFactory.create({
          organization_id: org.id,
          creator_id: owner.id,
          owner_id: owner.id,
          name: `Seed Task Create Second Project ${seedKey}`,
        })
        await ProjectMemberFactory.create({
          project_id: secondProject.id,
          user_id: owner.id,
          project_role: 'project_owner',
        })
        secondProjectTask = await TaskFactory.create({
          organization_id: org.id,
          creator_id: owner.id,
          assigned_to: owner.id,
          project_id: secondProject.id,
          status: 'todo',
          title: `Seed Scope Project B Task ${seedKey}`,
          description: 'Seeded for org-wide task scope E2E',
        })
      }

      const skillInputs = [
        { skill_name: `Seed Technology ${seedKey}`, category_code: 'technology' },
        { skill_name: `Seed Engineering ${seedKey}`, category_code: 'engineering' },
        { skill_name: `Seed Soft Skill ${seedKey}`, category_code: 'soft_skill' },
        { skill_name: `Seed Delivery ${seedKey}`, category_code: 'delivery' },
      ]
      const skills = await Promise.all(
        skillInputs.map((skill, index) =>
          SkillFactory.create({
            ...skill,
            sort_order: index + 1,
          })
        )
      )

      response.json(
        wrapApiV1Data({
          organizationId: org.id,
          projectId: project.id,
          projectName: project.name,
          projectTaskId: projectTask.id,
          projectTaskTitle: projectTask.title,
          secondProjectId: secondProject?.id ?? null,
          secondProjectName: secondProject?.name ?? null,
          secondProjectTaskId: secondProjectTask?.id ?? null,
          secondProjectTaskTitle: secondProjectTask?.title ?? null,
          ownerEmail,
          skills: skills.map((skill) => ({
            id: skill.id,
            name: skill.skill_name,
            categoryCode: skill.category_code,
          })),
          timestamp,
        })
      )
    })

    router.post('/seed-organization-invitation-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const withPendingInvitation = request.input('withPendingInvitation', false) === true
      const withForeignUser = request.input('withForeignUser', false) === true
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-invite-owner-${seedKey}@test.com`
      const inviteeEmail = `seed-invitee-${seedKey}@test.com`
      const foreignUserEmail = `seed-invite-foreign-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        { name: `Seed Invite Org ${seedKey}`, slug: `seed-invite-org-${seedKey}` },
        { email: ownerEmail, username: `seed_invite_owner_${seedKey.replace(/-/g, '_')}` }
      )

      const invitee = await UserFactory.create({
        email: inviteeEmail,
        username: `seed_invitee_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: null,
      })

      if (withPendingInvitation) {
        const inviteeWorkspace = await OrganizationFactory.create({
          name: `Seed Invitee Workspace ${seedKey}`,
          slug: `seed-invitee-workspace-${seedKey}`,
          owner_id: invitee.id,
        })
        await OrganizationUserFactory.create({
          organization_id: inviteeWorkspace.id,
          user_id: invitee.id,
          org_role: 'org_owner',
          status: 'approved',
        })
        invitee.current_organization_id = inviteeWorkspace.id
        await invitee.save()

        await OrganizationUserFactory.create({
          organization_id: org.id,
          user_id: invitee.id,
          org_role: 'org_member',
          status: 'pending',
          invited_by: owner.id,
        })
      }

      let foreignUser = null
      let foreignWorkspace = null
      if (withForeignUser) {
        foreignUser = await UserFactory.create({
          email: foreignUserEmail,
          username: `seed_invite_foreign_${seedKey.replace(/-/g, '_')}`,
          current_organization_id: null,
        })
        foreignWorkspace = await OrganizationFactory.create({
          name: `Seed Invite Foreign Workspace ${seedKey}`,
          slug: `seed-invite-foreign-workspace-${seedKey}`,
          owner_id: foreignUser.id,
        })
        await OrganizationUserFactory.create({
          organization_id: foreignWorkspace.id,
          user_id: foreignUser.id,
          org_role: 'org_owner',
          status: 'approved',
        })
        foreignUser.current_organization_id = foreignWorkspace.id
        await foreignUser.save()
      }

      response.json(
        wrapApiV1Data({
          organizationId: org.id,
          organizationName: org.name,
          ownerEmail,
          inviteeEmail,
          foreignUserEmail: foreignUser?.email ?? null,
          foreignWorkspaceId: foreignWorkspace?.id ?? null,
          ownerId: owner.id,
          inviteeId: invitee.id,
          foreignUserId: foreignUser?.id ?? null,
          timestamp,
        })
      )
    })

    router.post('/seed-organization-join-request-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const withPendingJoinRequest = request.input('withPendingJoinRequest', false) === true
      const withPendingAdmin = request.input('withPendingAdmin', false) === true
      const seedKey = `${timestamp}-${nonce}`
      const requesterEmail = `seed-join-requester-${seedKey}@test.com`
      const ownerEmail = `seed-join-owner-${seedKey}@test.com`
      const pendingAdminEmail = `seed-join-pending-admin-${seedKey}@test.com`

      const requester = await UserFactory.create({
        email: requesterEmail,
        username: `seed_join_requester_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: null,
      })

      const requesterWorkspace = await OrganizationFactory.create({
        name: `Seed Join Workspace ${seedKey}`,
        slug: `seed-join-workspace-${seedKey}`,
        owner_id: requester.id,
      })
      await OrganizationUserFactory.create({
        organization_id: requesterWorkspace.id,
        user_id: requester.id,
        org_role: 'org_owner',
        status: 'approved',
      })
      requester.current_organization_id = requesterWorkspace.id
      await requester.save()

      const { org: targetOrg, owner } = await OrganizationFactory.createWithOwner(
        {
          name: `Seed Join Target Org ${seedKey}`,
          slug: `seed-join-target-${seedKey}`,
        },
        {
          email: ownerEmail,
          username: `seed_join_owner_${seedKey.replace(/-/g, '_')}`,
        }
      )

      if (withPendingJoinRequest) {
        await OrganizationUserFactory.create({
          organization_id: targetOrg.id,
          user_id: requester.id,
          org_role: 'org_member',
          status: 'pending',
        })
      }

      let pendingAdmin = null
      if (withPendingAdmin) {
        pendingAdmin = await UserFactory.create({
          email: pendingAdminEmail,
          username: `seed_join_pending_admin_${seedKey.replace(/-/g, '_')}`,
          current_organization_id: targetOrg.id,
        })
        await OrganizationUserFactory.create({
          organization_id: targetOrg.id,
          user_id: pendingAdmin.id,
          org_role: 'org_admin',
          status: 'pending',
        })
      }

      response.json(
        wrapApiV1Data({
          requesterEmail,
          requesterWorkspaceId: requesterWorkspace.id,
          requesterId: requester.id,
          targetOrganizationId: targetOrg.id,
          targetOrganizationName: targetOrg.name,
          ownerEmail,
          ownerId: owner.id,
          pendingAdminEmail: pendingAdmin?.email ?? null,
          pendingAdminId: pendingAdmin?.id ?? null,
          timestamp,
        })
      )
    })

    router.post('/seed-marketplace-application-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const withApplication = request.input('withApplication', true) !== false
      const withSecondApplication = request.input('withSecondApplication', false) === true
      const demoNames = Boolean(request.input('demoNames', false))
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-market-owner-${seedKey}@test.com`
      const projectManagerEmail = `seed-market-project-manager-${seedKey}@test.com`
      const applicantEmail = `seed-market-applicant-${seedKey}@test.com`
      const secondApplicantEmail = `seed-market-second-applicant-${seedKey}@test.com`
      const sameOrgMemberEmail = `seed-market-member-${seedKey}@test.com`
      const foreignRecruiterEmail = `seed-market-foreign-recruiter-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        {
          name: demoNames ? 'Demo Delivery Org' : `Seed Marketplace Org ${seedKey}`,
          slug: `seed-marketplace-org-${seedKey}`,
        },
        {
          email: ownerEmail,
          username: demoNames
            ? `demo_market_owner_${nonce}`
            : `seed_market_owner_${seedKey.replace(/-/g, '_')}`,
        }
      )

      const applicant = await UserFactory.create({
        email: applicantEmail,
        username: demoNames
          ? `demo_applicant_${nonce}`
          : `seed_market_applicant_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: null,
        is_external_contributor: true,
      })
      const projectManager = await UserFactory.create({
        email: projectManagerEmail,
        username: `seed_market_project_manager_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: null,
      })
      const secondApplicant = await UserFactory.create({
        email: secondApplicantEmail,
        username: `seed_market_second_applicant_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: null,
        is_external_contributor: true,
      })
      const sameOrgMember = await UserFactory.create({
        email: sameOrgMemberEmail,
        username: `seed_market_member_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })
      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: sameOrgMember.id,
        org_role: 'org_member',
        status: 'approved',
      })
      const { org: foreignOrg, owner: foreignRecruiter } =
        await OrganizationFactory.createWithOwner(
          {
            name: `Seed Foreign Recruiter Org ${seedKey}`,
            slug: `seed-foreign-recruiter-org-${seedKey}`,
          },
          {
            email: foreignRecruiterEmail,
            username: `seed_market_foreign_recruiter_${seedKey.replace(/-/g, '_')}`,
          }
        )

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: demoNames ? 'Mobile Checkout QA' : `Seed Marketplace Project ${seedKey}`,
        allow_external_contributors: true,
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: projectManager.id,
        project_role: 'project_manager',
      })

      const task = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        project_id: project.id,
        task_visibility: 'external',
        assigned_to: null,
        title: demoNames
          ? `Checkout release evidence ${nonce}`
          : `Seed Marketplace Task ${seedKey}`,
        description: demoNames
          ? 'Verify checkout release readiness, collect regression evidence, and surface compliance risks before handoff.'
          : 'Seeded for E2E marketplace apply and withdraw flow',
      })
      const hiddenInternalTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        project_id: project.id,
        task_visibility: 'internal',
        assigned_to: null,
        title: `Seed Hidden Internal Task ${seedKey}`,
        description: 'Seeded internal task that must stay hidden from marketplace listing',
      })
      const assignedTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        project_id: project.id,
        task_visibility: 'external',
        assigned_to: owner.id,
        title: `Seed Assigned Marketplace Task ${seedKey}`,
        description: 'Seeded assigned task that must stay hidden from marketplace listing',
      })
      task.merge({
        task_type: 'feature_development',
        acceptance_criteria: demoNames
          ? 'Evidence covers happy path, payment failure, refund edge case, and release risk notes.'
          : task.acceptance_criteria,
        verification_method: 'code_review',
        context_background: demoNames
          ? 'Checkout is entering final QA before release. The team needs concise evidence, not a long handover document.'
          : task.context_background,
        role_in_task: 'sole_contributor',
        business_domain: 'fintech',
        problem_category: 'compliance',
        tech_stack: ['TypeScript', 'Svelte', 'AdonisJS'],
        domain_tags: ['checkout', 'release-readiness', 'qa-evidence'],
      })
      await task.save()
      const levelsByCode = await ensureTestingCanonicalProficiencyLevels()
      const seededSkills = await Promise.all([
        SkillFactory.create({
          skill_name: demoNames ? 'TypeScript QA Automation' : `Marketplace TypeScript ${seedKey}`,
          skill_code: `marketplace_typescript_${nonce}`,
          category_code: 'technology',
        }),
        SkillFactory.create({
          skill_name: demoNames ? 'API Design' : `Marketplace API Design ${seedKey}`,
          skill_code: `marketplace_api_design_${nonce}`,
          category_code: 'engineering',
        }),
        SkillFactory.create({
          skill_name: demoNames ? 'Release Communication' : `Marketplace Communication ${seedKey}`,
          skill_code: `marketplace_communication_${nonce}`,
          category_code: 'soft_skill',
        }),
        SkillFactory.create({
          skill_name: demoNames ? 'Release Ownership' : `Marketplace Release Ownership ${seedKey}`,
          skill_code: `marketplace_release_ownership_${nonce}`,
          category_code: 'delivery',
        }),
      ])
      const requiredSkillRows = seededSkills.map((skill, index) => {
        const levelCode = index === 0 ? 'l6' : index === 1 ? 'l4' : 'l5'
        return {
          id: testId(),
          task_id: task.id,
          skill_id: skill.id,
          project_skill_id: null,
          minimum_level_id: levelsByCode.get(levelCode) ?? null,
          target_level_id: levelsByCode.get('l7') ?? null,
          assessment_ceiling_level_id: levelsByCode.get('l10') ?? null,
          proficiency_level_id: levelsByCode.get(levelCode) ?? null,
          required_public_proficiency_code: levelCode,
          is_mandatory: true,
          importance: index === 0 ? 'high' : 'medium',
          weight: index === 0 ? 1.25 : 1,
          requirement_source: 'manual',
          requirement_notes: 'Seeded marketplace requirement for reliable profile match scoring.',
          rubric_version_id: null,
          source_project_professional_role_id: null,
          source_role_skill_id: null,
          created_at: DateTime.utc().toSQL(),
        }
      })
      await db.table('task_required_skills').insert(requiredSkillRows)
      await Promise.all(
        [applicant, secondApplicant].flatMap((candidate) =>
          seededSkills.map((skill) =>
            UserSkillFactory.create({
              user_id: candidate.id,
              skill_id: skill.id,
              verified_public_proficiency_code: 'l7',
              source: 'reviewed',
              total_reviews: 2,
              avg_score: 4.2,
              avg_percentage: 84,
            })
          )
        )
      )
      await db.table('user_work_history').insert(
        [applicant, secondApplicant].map((candidate) => ({
          id: testId(),
          user_id: candidate.id,
          task_id: testId(),
          task_assignment_id: testId(),
          organization_id: org.id,
          project_id: project.id,
          task_title: `Seed Marketplace Prior Work ${seedKey}`,
          task_type: 'feature_development',
          business_domain: 'fintech',
          problem_category: 'compliance',
          role_in_task: 'sole_contributor',
          autonomy_level: null,
          collaboration_type: 'solo',
          tech_stack: JSON.stringify(['TypeScript', 'AdonisJS', 'Svelte']),
          domain_tags: JSON.stringify(['fintech', 'application-flow']),
          difficulty: 'medium',
          estimated_hours: 8,
          actual_hours: 7,
          was_on_time: true,
          days_early_or_late: -1,
          measurable_outcomes: JSON.stringify([]),
          estimated_business_value: null,
          knowledge_artifacts: JSON.stringify([]),
          overall_quality_score: 4,
          skill_scores: JSON.stringify([]),
          evidence_links: JSON.stringify([]),
          is_featured: false,
          is_public: true,
          completed_at: DateTime.utc().minus({ days: 14 }).toSQL(),
        }))
      )

      const application = withApplication
        ? await TaskApplicationFactory.create({
            task_id: task.id,
            applicant_id: applicant.id,
            application_status: 'pending',
            application_source: 'public_listing',
            message: 'Seeded pending marketplace application',
            portfolio_links: ['https://portfolio.example.com/seeded-work'],
          })
        : null
      const secondApplication =
        withApplication && withSecondApplication
          ? await TaskApplicationFactory.create({
              task_id: task.id,
              applicant_id: secondApplicant.id,
              application_status: 'pending',
              application_source: 'public_listing',
              message: 'Seeded second pending marketplace application',
              portfolio_links: ['https://portfolio.example.com/second-seeded-work'],
            })
          : null

      response.json(
        wrapApiV1Data({
          organizationId: org.id,
          projectId: project.id,
          taskId: task.id,
          applicationId: application?.id ?? null,
          secondApplicationId: secondApplication?.id ?? null,
          ownerEmail,
          projectManagerEmail,
          applicantEmail,
          secondApplicantEmail,
          sameOrgMemberEmail,
          foreignRecruiterEmail,
          ownerId: owner.id,
          projectManagerId: projectManager.id,
          applicantId: applicant.id,
          secondApplicantId: secondApplicant.id,
          sameOrgMemberId: sameOrgMember.id,
          foreignOrganizationId: foreignOrg.id,
          foreignRecruiterId: foreignRecruiter.id,
          taskTitle: task.title,
          hiddenInternalTaskTitle: hiddenInternalTask.title,
          assignedTaskTitle: assignedTask.title,
          timestamp,
        })
      )
    })

    router.post('/seed-sprint-review-governance-flow', async ({ request, response }) => {
      const timestamp = Number(request.input('timestamp', Date.now()))
      const nonce = String(request.input('nonce', crypto.randomUUID().slice(0, 8)))
      const withForeignSprint = request.input('withForeignSprint', false) === true
      const taskInSprint = request.input('taskInSprint', false) === true
      const seedKey = `${timestamp}-${nonce}`
      const ownerEmail = `seed-sprint-owner-${seedKey}@test.com`
      const workerEmail = `seed-sprint-worker-${seedKey}@test.com`
      const adminEmail = `seed-sprint-admin-${seedKey}@test.com`

      const { org, owner } = await OrganizationFactory.createWithOwner(
        { name: `Seed Sprint Org ${seedKey}`, slug: `seed-sprint-org-${seedKey}` },
        { email: ownerEmail, username: `seed_sprint_owner_${seedKey.replace(/-/g, '_')}` }
      )

      const worker = await UserFactory.create({
        email: workerEmail,
        username: `seed_sprint_worker_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })
      const admin = await UserFactory.createSuperadmin({
        email: adminEmail,
        username: `seed_sprint_admin_${seedKey.replace(/-/g, '_')}`,
        current_organization_id: org.id,
      })

      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: worker.id,
        org_role: 'org_member',
        status: 'approved',
      })
      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: admin.id,
        org_role: 'org_admin',
        status: 'approved',
      })

      const project = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        manager_id: owner.id,
        name: `Seed Sprint Project ${seedKey}`,
      })

      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: worker.id,
        project_role: 'project_member',
      })

      const task = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: worker.id,
        project_id: project.id,
        status: 'in_progress',
        title: `Seed Sprint Task ${seedKey}`,
      })
      const assignment = await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: worker.id,
        assigned_by: owner.id,
        assignment_status: 'active',
        assignment_type: 'member',
      })
      const reviewSession = await ReviewSessionFactory.create({
        task_assignment_id: assignment.id,
        reviewee_id: worker.id,
        status: 'completed',
        creator_reviewer_id: owner.id,
        completed_at: DateTime.utc().minus({ days: 1 }),
      })

      const sprintId = testId()
      await db.table('project_sprints').insert({
        id: sprintId,
        organization_id: org.id,
        project_id: project.id,
        name: `Seed Sprint Review ${seedKey}`,
        goal: 'Stabilize Scrum planning, backlog scope, and review readiness.',
        status: 'active',
        starts_at: DateTime.utc().minus({ days: 14 }).toSQL(),
        ends_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
        created_by: owner.id,
        closed_by: null,
        review_opened_at: null,
        review_closed_at: null,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      })
      if (taskInSprint) {
        await db.from('tasks').where('id', task.id).update({
          project_sprint_id: sprintId,
          updated_at: DateTime.utc().toSQL(),
        })
      }

      let foreignProjectId: string | null = null
      let foreignSprintId: string | null = null
      if (withForeignSprint) {
        const foreignProject = await ProjectFactory.create({
          organization_id: org.id,
          creator_id: owner.id,
          owner_id: owner.id,
          manager_id: owner.id,
          name: `Seed Sprint Foreign Project ${seedKey}`,
        })

        await ProjectMemberFactory.create({
          project_id: foreignProject.id,
          user_id: owner.id,
          project_role: 'project_owner',
        })

        foreignProjectId = foreignProject.id
        foreignSprintId = testId()
        await db.table('project_sprints').insert({
          id: foreignSprintId,
          organization_id: org.id,
          project_id: foreignProject.id,
