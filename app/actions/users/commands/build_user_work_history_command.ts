import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'
import UserWorkHistoryRepository from '#infra/users/repositories/user_work_history_repository'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'

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

export default class BuildUserWorkHistoryCommand extends BaseCommand<
  BuildUserWorkHistoryDTO,
  BuildUserWorkHistoryResult
> {
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

  private toObjectArray(value: unknown): Array<Record<string, unknown>> {
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

  private calculateDeliveryTiming(
    dueDate: DateTime | null,
    completedAt: DateTime | null
  ): { wasOnTime: boolean | null; daysEarlyOrLate: number | null } {
    if (!dueDate || !completedAt) {
      return { wasOnTime: null, daysEarlyOrLate: null }
    }

    const diffDays = Math.round(completedAt.diff(dueDate, 'days').days)
    return {
      wasOnTime: diffDays <= 0,
      daysEarlyOrLate: diffDays,
    }
  }

  async handle(dto: BuildUserWorkHistoryDTO): Promise<BuildUserWorkHistoryResult> {
    return await this.executeInTransaction(async (trx) => {
      const assignmentRows = (await UserAnalyticsRepository.listCompletedAssignmentSnapshots(
        dto.userId,
        trx
      )) as AssignmentSnapshotRow[]

      if (dto.fullRebuild) {
        await UserWorkHistoryRepository.deleteByUser(dto.userId, trx)
      }

      let inserted = 0
      let updated = 0

      for (const assignment of assignmentRows) {
        const dueDate = this.toDateTime(assignment.due_date)
        const completedAt = this.toDateTime(assignment.completed_at)
        const { wasOnTime, daysEarlyOrLate } = this.calculateDeliveryTiming(dueDate, completedAt)

        const reviewSessions =
          (await UserAnalyticsRepository.listCompletedReviewSessionsForAssignment(
            assignment.task_assignment_id,
            dto.userId,
            trx
          )) as Array<{
            id: string
            overall_quality_score: number | null
          }>

        const sessionIds = reviewSessions.map((session) => session.id)
        const qualityValues = reviewSessions
          .map((session) => session.overall_quality_score)
          .filter((value): value is number => typeof value === 'number')

        const overallQualityScore =
          qualityValues.length > 0
            ? Math.round(
                (qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length) * 100
              ) / 100
            : null

        const skillScores =
          sessionIds.length > 0
            ? (
                (await UserAnalyticsRepository.listSkillReviewSummariesBySessionIds(
                  sessionIds,
                  trx
                )) as Array<{
                  skill_id: string
                  skill_name: string | null
                  assigned_level_code: string
                  reviewer_type: string
                  comment: string | null
                }>
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
                )) as Array<{
                  id: string
                  evidence_type: string
                  url: string | null
                  title: string | null
                }>
              ).map((item) => ({
                evidence_id: item.id,
                evidence_type: item.evidence_type,
                url: item.url,
                title: item.title,
              }))
            : []

        const selfAssessment = (await UserAnalyticsRepository.findSelfAssessmentNarrative(
          assignment.task_assignment_id,
          dto.userId,
          trx
        )) as
          | {
              what_went_well: string | null
              what_would_do_different: string | null
            }
          | undefined

        const knowledgeArtifacts: Array<Record<string, unknown>> = []
        if (selfAssessment?.what_went_well) {
          knowledgeArtifacts.push({
            type: 'retrospective_success',
            content: selfAssessment.what_went_well,
          })
        }

        if (selfAssessment?.what_would_do_different) {
          knowledgeArtifacts.push({
            type: 'retrospective_improvement',
            content: selfAssessment.what_would_do_different,
          })
        }

        const payload = {
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
            this.toNumber(assignment.assignment_actual_hours) ??
            this.toNumber(assignment.actual_time),
          was_on_time: wasOnTime,
          days_early_or_late: daysEarlyOrLate,
          measurable_outcomes: this.toObjectArray(assignment.measurable_outcomes),
          estimated_business_value: assignment.impact_scope,
          knowledge_artifacts: knowledgeArtifacts,
          overall_quality_score: overallQualityScore,
          skill_scores: skillScores,
          evidence_links: evidenceLinks,
          completed_at: completedAt,
          is_featured: false,
          is_public: false,
        }

        const existing = await UserWorkHistoryRepository.findByUserAndAssignment(
          dto.userId,
          assignment.task_assignment_id,
          trx
        )

        if (existing) {
          existing.merge(payload)
          await UserWorkHistoryRepository.save(existing, trx)
          updated += 1
        } else {
          await UserWorkHistoryRepository.create(
            {
              user_id: dto.userId,
              ...payload,
            },
            trx
          )
          inserted += 1
        }
      }

      await this.logAudit('build_user_work_history', 'user_work_history', dto.userId, null, {
        full_rebuild: dto.fullRebuild ?? false,
        total_completed_assignments: assignmentRows.length,
        inserted,
        updated,
      })

      return {
        userId: dto.userId,
        totalCompletedAssignments: assignmentRows.length,
        inserted,
        updated,
      }
    })
  }
}
