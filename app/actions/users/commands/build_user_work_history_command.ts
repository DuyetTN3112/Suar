import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import {
  buildKnowledgeArtifacts,
  calculateAverageScore,
  calculateWorkHistoryDeliveryTiming,
} from '#domain/users/profile_aggregate_rules'
import * as workHistoryQueries from '#infra/users/repositories/read/user_work_history_queries'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'
import * as workHistoryMutations from '#infra/users/repositories/write/user_work_history_mutations'
import type { DatabaseId } from '#types/database'

export interface BuildUserWorkHistoryDTO {
  userId: DatabaseId
  fullRebuild?: boolean
}

export interface BuildUserWorkHistoryResult {
  userId: DatabaseId
  totalCompletedAssignments: number
  inserted: number
  updated: number
}

interface AssignmentSnapshotRow {
  task_assignment_id: string
  task_id: string
  organization_id: string | null
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

interface CompletedReviewSessionRow {
  id: string
  overall_quality_score: number | null
}

interface SkillReviewSummaryRow {
  skill_id: string
  skill_name: string | null
  assigned_level_code: string
  reviewer_type: string
  comment: string | null
}

interface ReviewEvidenceSummaryRow {
  id: string
  evidence_type: string
  url: string | null
  title: string | null
}

interface SelfAssessmentNarrativeRow {
  what_went_well: string | null
  what_would_do_different: string | null
}

interface AssignmentAnalytics {
  completedAt: DateTime | null
  overallQualityScore: number | null
  skillScores: Record<string, unknown>[]
  evidenceLinks: Record<string, unknown>[]
  knowledgeArtifacts: Record<string, unknown>[]
}

interface WorkHistoryPayload {
  task_id: string
  task_assignment_id: string
  organization_id: string | null
  project_id: string | null
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  tech_stack: string[]
  domain_tags: string[]
  difficulty: string | null
  estimated_hours: number | null
  actual_hours: number | null
  was_on_time: boolean | null
  days_early_or_late: number | null
  measurable_outcomes: Record<string, unknown>[]
  estimated_business_value: string | null
  knowledge_artifacts: Record<string, unknown>[]
  overall_quality_score: number | null
  skill_scores: Record<string, unknown>[]
  evidence_links: Record<string, unknown>[]
  completed_at: DateTime | null
  is_featured: boolean
  is_public: boolean
}

interface MaterializedWorkHistoryBatch {
  inserted: number
  updated: number
}

export default class BuildUserWorkHistoryCommand extends BaseCommand<
  BuildUserWorkHistoryDTO,
  BuildUserWorkHistoryResult
> {
  async handle(dto: BuildUserWorkHistoryDTO): Promise<BuildUserWorkHistoryResult> {
    return await this.executeInTransaction(async (trx) => {
      const assignmentRows = await this.loadAssignmentSnapshots(dto.userId, trx)

      if (dto.fullRebuild) {
        await this.deleteExistingWorkHistory(dto.userId, trx)
      }

      const materialized = await this.materializeWorkHistory(dto.userId, assignmentRows, trx)

      await this.auditBuildSummary(
        dto.userId,
        dto.fullRebuild ?? false,
        assignmentRows.length,
        materialized.inserted,
        materialized.updated
      )

      return {
        userId: dto.userId,
        totalCompletedAssignments: assignmentRows.length,
        inserted: materialized.inserted,
        updated: materialized.updated,
      }
    })
  }

  private toDateTime(value: Date | string | null): DateTime | null {
    if (!value) return null

    if (value instanceof Date) {
      return DateTime.fromJSDate(value)
    }

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : null
  }

  private toNumber(value: number | string | null): number | null {
    if (value === null) return null
    const converted = Number(value)
    return Number.isFinite(converted) ? converted : null
  }

  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : []
      } catch {
        return []
      }
    }

    return []
  }

  private toObjectArray(value: unknown): Record<string, unknown>[] {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
      )
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter(
              (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
            )
          : []
      } catch {
        return []
      }
    }

    return []
  }

  private async loadAssignmentSnapshots(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<AssignmentSnapshotRow[]> {
    return (await UserAnalyticsRepository.listCompletedAssignmentSnapshots(
      userId,
      trx
    )) as AssignmentSnapshotRow[]
  }

  private async deleteExistingWorkHistory(
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    await workHistoryMutations.deleteByUser(userId, trx)
  }

  private async loadAssignmentAnalytics(
    userId: DatabaseId,
    assignment: AssignmentSnapshotRow,
    trx: TransactionClientContract
  ): Promise<AssignmentAnalytics> {
    const completedAt = this.toDateTime(assignment.completed_at)
    const reviewSessions = (await UserAnalyticsRepository.listCompletedReviewSessionsForAssignment(
      assignment.task_assignment_id,
      userId,
      trx
    )) as CompletedReviewSessionRow[]

    const sessionIds = reviewSessions.map((session) => session.id)
    const qualityValues = reviewSessions
      .map((session) => session.overall_quality_score)
      .filter((value): value is number => typeof value === 'number')

    const overallQualityScore = calculateAverageScore(qualityValues)

    const skillScores =
      sessionIds.length > 0
        ? (
            (await UserAnalyticsRepository.listSkillReviewSummariesBySessionIds(
              sessionIds,
              trx
            )) as SkillReviewSummaryRow[]
          ).map((item) => ({
            skill_id: item.skill_id,
            skill_name: item.skill_name,
            assigned_level_code: item.assigned_level_code,
            reviewer_type: item.reviewer_type,
            comment: item.comment,
          }))
        : []

    const evidenceLinks =
      sessionIds.length > 0
        ? (
            (await UserAnalyticsRepository.listReviewEvidenceSummariesBySessionIds(
              sessionIds,
              trx
            )) as ReviewEvidenceSummaryRow[]
          ).map((item) => ({
            evidence_id: item.id,
            evidence_type: item.evidence_type,
            url: item.url,
            title: item.title,
          }))
        : []

    const selfAssessment = (await UserAnalyticsRepository.findSelfAssessmentNarrative(
      assignment.task_assignment_id,
      userId,
      trx
    )) as SelfAssessmentNarrativeRow | undefined

    return {
      completedAt,
      overallQualityScore,
      skillScores,
      evidenceLinks,
      knowledgeArtifacts: buildKnowledgeArtifacts({
        whatWentWell: selfAssessment?.what_went_well ?? null,
        whatWouldDoDifferent: selfAssessment?.what_would_do_different ?? null,
      }),
    }
  }

  private buildWorkHistoryPayload(
    assignment: AssignmentSnapshotRow,
    analytics: AssignmentAnalytics
  ): WorkHistoryPayload {
    const dueDate = this.toDateTime(assignment.due_date)
    const { wasOnTime, daysEarlyOrLate } = calculateWorkHistoryDeliveryTiming({
      dueDate: dueDate?.toJSDate() ?? null,
      completedAt: analytics.completedAt?.toJSDate() ?? null,
    })

    return {
      task_id: assignment.task_id,
      task_assignment_id: assignment.task_assignment_id,
      organization_id: assignment.organization_id,
      project_id: assignment.project_id,
      task_title: assignment.task_title,
      task_type: assignment.task_type,
      business_domain: assignment.business_domain,
      problem_category: assignment.problem_category,
      role_in_task: assignment.role_in_task,
      autonomy_level: assignment.autonomy_level,
      collaboration_type: assignment.collaboration_type,
      tech_stack: this.toStringArray(assignment.tech_stack),
      domain_tags: this.toStringArray(assignment.domain_tags),
      difficulty: assignment.difficulty,
      estimated_hours:
        this.toNumber(assignment.assignment_estimated_hours) ??
        this.toNumber(assignment.estimated_time),
      actual_hours:
        this.toNumber(assignment.assignment_actual_hours) ?? this.toNumber(assignment.actual_time),
      was_on_time: wasOnTime,
      days_early_or_late: daysEarlyOrLate,
      measurable_outcomes: this.toObjectArray(assignment.measurable_outcomes),
      estimated_business_value: assignment.impact_scope,
      knowledge_artifacts: analytics.knowledgeArtifacts,
      overall_quality_score: analytics.overallQualityScore,
      skill_scores: analytics.skillScores,
      evidence_links: analytics.evidenceLinks,
      completed_at: analytics.completedAt,
      is_featured: false,
      is_public: false,
    }
  }

  private async upsertWorkHistoryRow(
    userId: DatabaseId,
    payload: WorkHistoryPayload,
    trx: TransactionClientContract
  ): Promise<'inserted' | 'updated'> {
    const existing = await workHistoryQueries.findByUserAndAssignment(
      userId,
      payload.task_assignment_id,
      trx
    )

    if (existing) {
      existing.merge(payload)
      await workHistoryMutations.save(existing, trx)
      return 'updated'
    }

    await workHistoryMutations.create(
      {
        user_id: userId,
        ...payload,
      },
      trx
    )
    return 'inserted'
  }

  private async materializeWorkHistory(
    userId: DatabaseId,
    assignmentRows: AssignmentSnapshotRow[],
    trx: TransactionClientContract
  ): Promise<MaterializedWorkHistoryBatch> {
    let inserted = 0
    let updated = 0

    for (const assignment of assignmentRows) {
      const analytics = await this.loadAssignmentAnalytics(userId, assignment, trx)
      const payload = this.buildWorkHistoryPayload(assignment, analytics)
      const outcome = await this.upsertWorkHistoryRow(userId, payload, trx)

      if (outcome === 'inserted') {
        inserted += 1
      } else {
        updated += 1
      }
    }

    return { inserted, updated }
  }

  private async auditBuildSummary(
    userId: DatabaseId,
    fullRebuild: boolean,
    totalCompletedAssignments: number,
    inserted: number,
    updated: number
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'build_user_work_history',
        entity_type: 'user_work_history',
        entity_id: userId,
        old_values: null,
        new_values: {
          full_rebuild: fullRebuild,
          total_completed_assignments: totalCompletedAssignments,
          inserted,
          updated,
        },
      })
    }
  }
}
