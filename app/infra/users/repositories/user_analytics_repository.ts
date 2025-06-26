import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import TaskSelfAssessment from '#models/task_self_assessment'

export default class UserAnalyticsRepository {
  private readonly __instanceMarker = true

  static {
    void new UserAnalyticsRepository().__instanceMarker
  }

  static async listCompletedAssignmentSnapshots(
    userId: DatabaseId,
    trx: TransactionClientContract
  ) {
    return trx
      .from('task_assignments as ta')
      .join('tasks as t', 't.id', 'ta.task_id')
      .where('ta.assignee_id', userId)
      .where('ta.assignment_status', 'completed')
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
  }

  static async listCompletedReviewSessionsForAssignment(
    taskAssignmentId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ) {
    return trx
      .from('review_sessions')
      .where('task_assignment_id', taskAssignmentId)
      .where('reviewee_id', userId)
      .where('status', 'completed')
      .select('id', 'overall_quality_score')
  }

  static async listSkillReviewSummariesBySessionIds(
    sessionIds: DatabaseId[],
    trx: TransactionClientContract
  ) {
    if (sessionIds.length === 0) {
      return []
    }

    return trx
      .from('skill_reviews as sr')
      .leftJoin('skills as s', 's.id', 'sr.skill_id')
      .whereIn('sr.review_session_id', sessionIds)
      .select(
        'sr.skill_id',
        's.skill_name',
        'sr.assigned_level_code',
        'sr.reviewer_type',
        'sr.comment'
      )
  }

  static async listReviewEvidenceSummariesBySessionIds(
    sessionIds: DatabaseId[],
    trx: TransactionClientContract
  ) {
    if (sessionIds.length === 0) {
      return []
    }

    return trx
      .from('review_evidences')
      .whereIn('review_session_id', sessionIds)
      .select('id', 'evidence_type', 'url', 'title')
  }

  static async findSelfAssessmentNarrative(
    taskAssignmentId: DatabaseId,
    userId: DatabaseId,
    trx: TransactionClientContract
  ) {
    return TaskSelfAssessment.query({ client: trx })
      .where('task_assignment_id', taskAssignmentId)
      .where('user_id', userId)
      .select('what_went_well', 'what_would_do_different')
      .first()
  }

  static async listWorkHistoryRows(
    userId: DatabaseId,
    options: { periodStartSql?: string | null; periodEndSql?: string | null },
    trx: TransactionClientContract
  ) {
    const query = trx
      .from('user_work_history')
      .where('user_id', userId)
      .orderBy('completed_at', 'asc')

    if (options.periodStartSql) {
      void query.where('completed_at', '>=', options.periodStartSql)
    }

    if (options.periodEndSql) {
      void query.where('completed_at', '<=', options.periodEndSql)
    }

    return query.select(
      'task_type',
      'difficulty',
      'business_domain',
      'role_in_task',
      'collaboration_type',
      'actual_hours',
      'overall_quality_score',
      'was_on_time',
      'days_early_or_late',
      'completed_at'
    )
  }

  static async listSelfAssessmentAccuracyRows(
    userId: DatabaseId,
    options: { periodStartSql?: string | null; periodEndSql?: string | null },
    trx: TransactionClientContract
  ) {
    const query = trx
      .from('task_self_assessments as tsa')
      .join('review_sessions as rs', 'rs.task_assignment_id', 'tsa.task_assignment_id')
      .where('tsa.user_id', userId)
      .where('rs.reviewee_id', userId)
      .where('rs.status', 'completed')
      .whereNotNull('tsa.overall_satisfaction')
      .whereNotNull('rs.overall_quality_score')

    if (options.periodStartSql) {
      void query.where('rs.completed_at', '>=', options.periodStartSql)
    }

    if (options.periodEndSql) {
      void query.where('rs.completed_at', '<=', options.periodEndSql)
    }

    return query.select('tsa.overall_satisfaction', 'rs.overall_quality_score')
  }

  static async listDomainExpertiseRows(userId: DatabaseId, trx: TransactionClientContract) {
    return trx
      .from('user_work_history')
      .where('user_id', userId)
      .select('tech_stack', 'domain_tags', 'business_domain', 'problem_category', 'skill_scores')
  }
}
