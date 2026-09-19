import db from '@adonisjs/lucid/services/db'

import { testingSearchRoleplayService } from './testing_search_roleplay_service.js'

export type CleanupStats = Record<string, number>

export type RawRowsResult<T> = {
  rows: T[]
}

export type RawWhereBuilder = {
  orWhereRaw: (sql: string, bindings: readonly unknown[]) => RawWhereBuilder
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export function tableNameWithoutSchema(table: string): string {
  return table.split('.').at(-1) ?? table
}

export function isRawRowsResult<T>(value: unknown): value is RawRowsResult<T> {
  return typeof value === 'object' && value !== null && 'rows' in value && Array.isArray(value.rows)
}

export function readRawRows<T>(value: unknown): T[] {
  return isRawRowsResult<T>(value) ? value.rows : []
}

export function readTestingJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }

  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function addCleanupStat(stats: CleanupStats, table: string, count: unknown): void {
  const numericCount = Number(count ?? 0)
  if (!Number.isFinite(numericCount) || numericCount <= 0) {
    return
  }

  stats[table] = (stats[table] ?? 0) + numericCount
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))]
}

export class TestingDatabaseCleaner {
  private columnExistsCache = new Map<string, boolean>()

  async tableExists(table: string): Promise<boolean> {
    const tableName = tableNameWithoutSchema(table)
    const exists = (await db
      .from('information_schema.tables')
      .where('table_schema', 'public')
      .where('table_name', tableName)
      .first()) as unknown

    return Boolean(exists)
  }

  async columnExists(table: string, column: string): Promise<boolean> {
    const tableName = tableNameWithoutSchema(table)
    const cacheKey = `${tableName}.${column}`
    const cached = this.columnExistsCache.get(cacheKey)
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
    this.columnExistsCache.set(cacheKey, result)
    return result
  }

  async existingColumns(table: string, columns: readonly string[]): Promise<string[]> {
    const result: string[] = []
    for (const column of columns) {
      if (await this.columnExists(table, column)) {
        result.push(column)
      }
    }
    return result
  }

  async selectIdsByTokens(
    table: string,
    columns: readonly string[],
    tokens: readonly string[]
  ): Promise<string[]> {
    if (tokens.length === 0 || !(await this.tableExists(table)) || !(await this.columnExists(table, 'id'))) {
      return []
    }

    const searchableColumns = await this.existingColumns(table, columns)
    if (searchableColumns.length === 0) {
      return []
    }

    const rows = (await db
      .from(table)
      .select('id')
      .where((query) => {
        const rawQuery = query as unknown as RawWhereBuilder
        for (const token of tokens) {
          const pattern = `%${escapeLikePattern(token)}%`
          for (const column of searchableColumns) {
            rawQuery.orWhereRaw("??::text ILIKE ? ESCAPE '\\'", [column, pattern])
          }
        }
      })) as { id: string }[]

    return unique(rows.map((row) => row.id))
  }

  async selectIdsWhereIn(
    table: string,
    column: string,
    values: readonly string[]
  ): Promise<string[]> {
    if (
      values.length === 0 ||
      !(await this.tableExists(table)) ||
      !(await this.columnExists(table, 'id')) ||
      !(await this.columnExists(table, column))
    ) {
      return []
    }

    const rows = (await db
      .from(table)
      .select('id')
      .whereIn(column, [...values])) as { id: string }[]
    return unique(rows.map((row) => row.id))
  }

  async selectValuesWhereIn(
    table: string,
    valueColumn: string,
    whereColumn: string,
    values: readonly string[]
  ): Promise<string[]> {
    if (
      values.length === 0 ||
      !(await this.tableExists(table)) ||
      !(await this.columnExists(table, valueColumn)) ||
      !(await this.columnExists(table, whereColumn))
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

  async deleteWhereIn(
    table: string,
    column: string,
    values: readonly string[],
    stats: CleanupStats
  ): Promise<void> {
    if (values.length === 0 || !(await this.tableExists(table)) || !(await this.columnExists(table, column))) {
      return
    }

    const deleted = await db
      .from(table)
      .whereIn(column, [...values])
      .delete()

    addCleanupStat(stats, table, deleted)
  }

  async deleteByTokens(
    table: string,
    columns: readonly string[],
    tokens: readonly string[],
    stats: CleanupStats
  ): Promise<void> {
    if (tokens.length === 0 || !(await this.tableExists(table))) {
      return
    }

    const searchableColumns = await this.existingColumns(table, columns)
    if (searchableColumns.length === 0) {
      return
    }

    const deleted = await db
      .from(table)
      .where((query) => {
        const rawQuery = query as unknown as RawWhereBuilder
        for (const token of tokens) {
          const pattern = `%${escapeLikePattern(token)}%`
          for (const column of searchableColumns) {
            rawQuery.orWhereRaw("??::text ILIKE ? ESCAPE '\\'", [column, pattern])
          }
        }
      })
      .delete()

    addCleanupStat(stats, table, deleted)
  }

  async deleteCacheInvalidationOutboxForScopes(
    scopeIds: readonly string[],
    stats: CleanupStats
  ): Promise<void> {
    const uniqueScopeIds = unique([...scopeIds])
    if (uniqueScopeIds.length === 0 || !(await this.tableExists('cache_invalidation_outbox'))) {
      return
    }

    for (const scopeId of uniqueScopeIds) {
      const deleted = await db
        .from('cache_invalidation_outbox')
        .where('status', 'processed')
        .where((scopeQuery) => {
          const rawQuery = scopeQuery as unknown as RawWhereBuilder
          rawQuery.orWhereRaw('source_primary_key = ?', [scopeId])
          rawQuery.orWhereRaw("patterns::text LIKE ? ESCAPE '\\'", [
            `%${escapeLikePattern(scopeId)}%`,
          ])
        })
        .delete()
      addCleanupStat(stats, 'cache_invalidation_outbox', deleted)
    }
  }

  async cleanupTestingSeedData(tokens: readonly string[]): Promise<CleanupStats> {
    await testingSearchRoleplayService.cleanupSearchRoleplayState(tokens)
    const stats: CleanupStats = {}

    const userIds = await this.selectIdsByTokens('users', ['email', 'username'], tokens)
    const skillIds = await this.selectIdsByTokens('skills', ['skill_name', 'skill_code'], tokens)

    const organizationIds = unique([
      ...(await this.selectIdsByTokens('organizations', ['name', 'slug', 'description'], tokens)),
      ...(await this.selectIdsWhereIn('organizations', 'owner_id', userIds)),
    ])
    const savedViewIds = unique([
      ...(await this.selectIdsWhereIn('filter_saved_views', 'owner_user_id', userIds)),
      ...(await this.selectIdsWhereIn('filter_saved_views', 'owner_organization_id', organizationIds)),
      ...(await this.selectIdsWhereIn('filter_saved_views', 'organization_id', organizationIds)),
    ])
    const projectIds = unique([
      ...(await this.selectIdsByTokens('projects', ['name', 'slug', 'description'], tokens)),
      ...(await this.selectIdsWhereIn('projects', 'organization_id', organizationIds)),
      ...(await this.selectIdsWhereIn('projects', 'owner_id', userIds)),
      ...(await this.selectIdsWhereIn('projects', 'creator_id', userIds)),
      ...(await this.selectIdsWhereIn('projects', 'manager_id', userIds)),
    ])
    const sprintIds = unique([
      ...(await this.selectIdsByTokens('project_sprints', ['name', 'goal'], tokens)),
      ...(await this.selectIdsWhereIn('project_sprints', 'organization_id', organizationIds)),
      ...(await this.selectIdsWhereIn('project_sprints', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn('project_sprints', 'created_by', userIds)),
    ])
    const taskIds = unique([
      ...(await this.selectIdsByTokens('tasks', ['title', 'description'], tokens)),
      ...(await this.selectIdsWhereIn('tasks', 'organization_id', organizationIds)),
      ...(await this.selectIdsWhereIn('tasks', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn('tasks', 'project_sprint_id', sprintIds)),
      ...(await this.selectIdsWhereIn('tasks', 'creator_id', userIds)),
      ...(await this.selectIdsWhereIn('tasks', 'assigned_to', userIds)),
    ])
    const projectSkillIds = unique([
      ...(await this.selectIdsWhereIn('project_skills', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn('project_skills', 'skill_id', skillIds)),
    ])
    const projectSkillSkillIds = await this.selectValuesWhereIn(
      'project_skills',
      'skill_id',
      'id',
      projectSkillIds
    )
    const allSkillIds = unique([...skillIds, ...projectSkillSkillIds])
    const projectRoleIds = await this.selectIdsWhereIn(
      'project_professional_roles',
      'project_id',
      projectIds
    )
    const taskAssignmentIds = unique([
      ...(await this.selectIdsWhereIn('task_assignments', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('task_assignments', 'assignee_id', userIds)),
      ...(await this.selectIdsWhereIn('task_assignments', 'assigned_by', userIds)),
    ])
    const reviewSessionIds = unique([
      ...(await this.selectIdsWhereIn('review_sessions', 'task_assignment_id', taskAssignmentIds)),
      ...(await this.selectIdsWhereIn('review_sessions', 'reviewee_id', userIds)),
      ...(await this.selectIdsWhereIn('review_sessions', 'creator_reviewer_id', userIds)),
    ])
    const skillReviewIds = unique([
      ...(await this.selectIdsWhereIn('skill_reviews', 'review_session_id', reviewSessionIds)),
      ...(await this.selectIdsWhereIn('skill_reviews', 'reviewer_id', userIds)),
      ...(await this.selectIdsWhereIn('skill_reviews', 'reviewee_id', userIds)),
      ...(await this.selectIdsWhereIn('skill_reviews', 'skill_id', allSkillIds)),
    ])
    const reviewEvidenceIds = unique([
      ...(await this.selectIdsWhereIn('review_evidences', 'review_session_id', reviewSessionIds)),
      ...(await this.selectIdsWhereIn('review_evidences', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('review_evidences', 'submitted_by', userIds)),
    ])
    const disputeIds = unique([
      ...(await this.selectIdsWhereIn('review_disputes', 'review_session_id', reviewSessionIds)),
      ...(await this.selectIdsWhereIn('review_disputes', 'task_assignment_id', taskAssignmentIds)),
      ...(await this.selectIdsWhereIn('review_disputes', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('review_disputes', 'reviewee_id', userIds)),
      ...(await this.selectIdsWhereIn('review_disputes', 'opened_by', userIds)),
    ])
    const aiEvaluationIds = await this.selectIdsWhereIn('ai_dispute_evaluations', 'dispute_id', disputeIds)
    const taskSubmissionIds = unique([
      ...(await this.selectIdsWhereIn('task_submissions', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('task_submissions', 'submitted_by', userIds)),
    ])
    const taskCommentIds = unique([
      ...(await this.selectIdsWhereIn('task_comments', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('task_comments', 'user_id', userIds)),
      ...(await this.selectIdsWhereIn('task_comments', 'author_id', userIds)),
    ])
    const taskReviewWorkflowIds = unique([
      ...(await this.selectIdsWhereIn('task_review_workflows', 'task_id', taskIds)),
      ...(await this.selectIdsWhereIn('task_review_workflows', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn('task_review_workflows', 'organization_id', organizationIds)),
      ...(await this.selectIdsWhereIn('task_review_workflows', 'reviewee_id', userIds)),
    ])
    const sprintReviewPackageIds = unique([
      ...(await this.selectIdsWhereIn('sprint_review_packages', 'sprint_id', sprintIds)),
      ...(await this.selectIdsWhereIn('sprint_review_packages', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn('sprint_review_packages', 'organization_id', organizationIds)),
    ])
    const sprintReverseWorkflowIds = unique([
      ...(await this.selectIdsWhereIn('sprint_reverse_review_workflows', 'sprint_id', sprintIds)),
      ...(await this.selectIdsWhereIn('sprint_reverse_review_workflows', 'project_id', projectIds)),
      ...(await this.selectIdsWhereIn(
        'sprint_reverse_review_workflows',
        'organization_id',
        organizationIds
      )),
      ...(await this.selectIdsWhereIn('sprint_reverse_review_workflows', 'reviewer_id', userIds)),
      ...(await this.selectIdsWhereIn('sprint_reverse_review_workflows', 'target_user_id', userIds)),
      ...(await this.selectIdsWhereIn('sprint_reverse_review_workflows', 'responder_id', userIds)),
    ])

    await this.deleteByTokens(
      'audit_events',
      ['action', 'entity_type', 'entity_id', 'old_values', 'new_values', 'user_agent'],
      tokens,
      stats
    )
    await this.deleteByTokens('notifications', ['title', 'message', 'body', 'metadata'], tokens, stats)
    await this.deleteWhereIn('notification_fanout_targets', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('notification_acceptance_ledger', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('notification_recipient_states', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('notification_tombstones', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('notification_outbox', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('notification_outbox', 'disposed_by', userIds, stats)
    await this.deleteWhereIn('notifications', 'user_id', userIds, stats)
    await this.deleteByTokens('error_events', ['message', 'context', 'user_agent'], tokens, stats)

    await this.deleteWhereIn('filter_alerts', 'saved_view_id', savedViewIds, stats)
    await this.deleteWhereIn('filter_alerts', 'owner_user_id', userIds, stats)
    await this.deleteWhereIn('filter_saved_view_migration_runs', 'saved_view_id', savedViewIds, stats)
    await this.deleteWhereIn('filter_saved_view_grants', 'saved_view_id', savedViewIds, stats)
    await this.deleteWhereIn('filter_saved_view_grants', 'created_by', userIds, stats)
    await this.deleteWhereIn('filter_saved_views', 'id', savedViewIds, stats)

    await this.deleteWhereIn('ai_dispute_feedback', 'evaluation_id', aiEvaluationIds, stats)
    await this.deleteWhereIn('ai_dispute_evaluations', 'id', aiEvaluationIds, stats)
    await this.deleteWhereIn('ai_dispute_evaluations', 'dispute_id', disputeIds, stats)
    await this.deleteWhereIn('flagged_reviews', 'review_session_id', reviewSessionIds, stats)
    await this.deleteWhereIn('flagged_reviews', 'task_id', taskIds, stats)
    await this.deleteWhereIn('sprint_review_dispute_comments', 'dispute_id', disputeIds, stats)
    await this.deleteWhereIn('sprint_review_dispute_comments', 'author_id', userIds, stats)
    await this.deleteWhereIn('sprint_review_disputes', 'sprint_id', sprintIds, stats)
    await this.deleteWhereIn('sprint_review_disputes', 'task_id', taskIds, stats)
    await this.deleteWhereIn(
      'sprint_reverse_review_messages',
      'workflow_id',
      sprintReverseWorkflowIds,
      stats
    )
    await this.deleteWhereIn('sprint_reverse_review_messages', 'author_id', userIds, stats)
    await this.deleteWhereIn('sprint_reverse_review_workflows', 'id', sprintReverseWorkflowIds, stats)
    await this.deleteWhereIn('sprint_environment_reviews', 'package_id', sprintReviewPackageIds, stats)
    await this.deleteWhereIn('sprint_manager_reviews', 'package_id', sprintReviewPackageIds, stats)
    await this.deleteWhereIn('sprint_review_packages', 'id', sprintReviewPackageIds, stats)
    await this.deleteWhereIn('project_sprints', 'id', sprintIds, stats)
    await this.deleteWhereIn('review_dispute_case_files', 'dispute_id', disputeIds, stats)
    await this.deleteWhereIn('review_dispute_evidences', 'dispute_id', disputeIds, stats)
    await this.deleteWhereIn('review_dispute_comments', 'dispute_id', disputeIds, stats)
    await this.deleteWhereIn('review_disputes', 'id', disputeIds, stats)
    await this.deleteWhereIn('reverse_review_target_stats', 'target_user_id', userIds, stats)
    await this.deleteWhereIn('reverse_reviews', 'reviewer_id', userIds, stats)
    await this.deleteWhereIn('reverse_reviews', 'target_user_id', userIds, stats)
    await this.deleteWhereIn('skill_review_evidence_links', 'skill_review_id', skillReviewIds, stats)
    await this.deleteWhereIn('skill_review_evidence_links', 'review_evidence_id', reviewEvidenceIds, stats)
    await this.deleteWhereIn('skill_reviews', 'id', skillReviewIds, stats)
    await this.deleteWhereIn('review_evidences', 'id', reviewEvidenceIds, stats)
    await this.deleteWhereIn(
      'review_session_reviewer_assignments',
      'review_session_id',
      reviewSessionIds,
      stats
    )
    await this.deleteWhereIn('review_session_reviewer_assignments', 'reviewer_id', userIds, stats)
    await this.deleteWhereIn('task_self_assessments', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_self_assessments', 'user_id', userIds, stats)
    await this.deleteWhereIn('review_sessions', 'id', reviewSessionIds, stats)
    await this.deleteWhereIn('user_profile_snapshots', 'user_id', userIds, stats)
    await this.deleteWhereIn('user_work_history', 'user_id', userIds, stats)
    await this.deleteWhereIn('user_work_history', 'task_id', taskIds, stats)
    await this.deleteWhereIn('user_domain_expertise', 'user_id', userIds, stats)
    await this.deleteWhereIn('user_performance_stats', 'user_id', userIds, stats)
    await this.deleteWhereIn('user_skills', 'user_id', userIds, stats)
    await this.deleteWhereIn('user_skills', 'skill_id', allSkillIds, stats)
    await this.deleteWhereIn('recruiter_bookmarks', 'recruiter_id', userIds, stats)
    await this.deleteWhereIn('recruiter_bookmarks', 'talent_id', userIds, stats)
    await this.deleteWhereIn('user_subscriptions', 'user_id', userIds, stats)
    await this.deleteWhereIn('messages', 'sender_id', userIds, stats)
    await this.deleteWhereIn('messages', 'recipient_id', userIds, stats)
    await this.deleteWhereIn('task_submission_evidences', 'task_submission_id', taskSubmissionIds, stats)
    await this.deleteWhereIn('task_submission_evidences', 'submitted_by', userIds, stats)
    await this.deleteWhereIn('task_submissions', 'id', taskSubmissionIds, stats)
    await this.deleteWhereIn('task_comment_mentions', 'task_comment_id', taskCommentIds, stats)
    await this.deleteWhereIn('task_comment_mentions', 'mentioned_user_id', userIds, stats)
    await this.deleteWhereIn('task_comments', 'id', taskCommentIds, stats)
    await this.deleteWhereIn('task_attachments', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_attachments', 'uploaded_by', userIds, stats)
    await this.deleteWhereIn('task_assignment_snapshots', 'task_assignment_id', taskAssignmentIds, stats)
    await this.deleteWhereIn('task_requirement_version_items', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_requirement_versions', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_required_skills', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_required_skills', 'skill_id', allSkillIds, stats)
    await this.deleteWhereIn('task_versions', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_review_messages', 'workflow_id', taskReviewWorkflowIds, stats)
    await this.deleteWhereIn('task_review_reviewers', 'workflow_id', taskReviewWorkflowIds, stats)
    await this.deleteWhereIn('task_review_workflows', 'id', taskReviewWorkflowIds, stats)
    await this.deleteWhereIn('task_assignments', 'id', taskAssignmentIds, stats)
    await this.deleteWhereIn('task_applications', 'task_id', taskIds, stats)
    await this.deleteWhereIn('task_applications', 'applicant_id', userIds, stats)
    await this.deleteWhereIn('project_attachments', 'project_id', projectIds, stats)
    await this.deleteWhereIn('project_attachments', 'uploaded_by', userIds, stats)
    await this.deleteWhereIn('project_members', 'project_id', projectIds, stats)
    await this.deleteWhereIn('project_members', 'user_id', userIds, stats)
    await this.deleteWhereIn('marketplace_applications', 'task_id', taskIds, stats)
    await this.deleteWhereIn('marketplace_applications', 'applicant_id', userIds, stats)
    await this.deleteWhereIn('task_workflow_transitions', 'task_id', taskIds, stats)
    await this.deleteWhereIn('tasks', 'id', taskIds, stats)
    await this.deleteWhereIn('task_statuses', 'organization_id', organizationIds, stats)
    await this.deleteWhereIn(
      'project_professional_role_skills',
      'project_professional_role_id',
      projectRoleIds,
      stats
    )
    await this.deleteWhereIn(
      'project_professional_role_skills',
      'project_skill_id',
      projectSkillIds,
      stats
    )
    await this.deleteWhereIn('project_professional_roles', 'id', projectRoleIds, stats)
    await this.deleteWhereIn('project_skills', 'id', projectSkillIds, stats)
    await this.deleteWhereIn('organization_users', 'organization_id', organizationIds, stats)
    await this.deleteWhereIn('organization_users', 'user_id', userIds, stats)
    await this.deleteWhereIn('projects', 'id', projectIds, stats)
    await this.deleteWhereIn('organizations', 'id', organizationIds, stats)
    await this.deleteWhereIn('user_oauth_providers', 'user_id', userIds, stats)
    await this.deleteWhereIn('remember_me_tokens', 'tokenable_id', userIds, stats)
    await this.deleteWhereIn('skills', 'id', allSkillIds, stats)
    await this.deleteWhereIn('users', 'id', userIds, stats)
    await this.deleteCacheInvalidationOutboxForScopes(
      [
        ...userIds,
        ...organizationIds,
        ...projectIds,
        ...sprintIds,
        ...taskIds,
        ...taskAssignmentIds,
        ...reviewSessionIds,
        ...skillReviewIds,
        ...reviewEvidenceIds,
        ...disputeIds,
        ...taskSubmissionIds,
        ...taskCommentIds,
        ...taskReviewWorkflowIds,
        ...sprintReviewPackageIds,
        ...sprintReverseWorkflowIds,
      ],
      stats
    )

    return stats
  }
}

export const testingDatabaseCleaner = new TestingDatabaseCleaner()
