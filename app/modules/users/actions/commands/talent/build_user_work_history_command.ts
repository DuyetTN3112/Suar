import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { TransactionalAuditOptions } from '#modules/users/actions/dtos/transactional_audit'
import type {
  UserCompletedAssignmentFact,
  UserCompletedAssignmentFactReader,
} from '#modules/users/actions/ports/outbound/user_completed_assignment_fact_reader'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type {
  UserProfileReviewFact,
  UserProfileReviewFactReader,
} from '#modules/users/actions/ports/outbound/user_profile_review_fact_reader'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { calculateWorkHistoryDeliveryTiming } from '#modules/users/domain/profile/profile_aggregate_rules'

export interface BuildUserWorkHistoryDTO {
  userId: string
  fullRebuild?: boolean
}

export interface BuildUserWorkHistoryResult {
  userId: string
  totalCompletedAssignments: number
  inserted: number
  updated: number
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
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly profiles: UserProfileRepository,
    private readonly completedAssignmentFactReader: UserCompletedAssignmentFactReader,
    private readonly profileReviewFactReader: UserProfileReviewFactReader
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: BuildUserWorkHistoryDTO): Promise<BuildUserWorkHistoryResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: BuildUserWorkHistoryDTO,
    trx: UserTransaction,
    auditOptions: TransactionalAuditOptions = {}
  ): Promise<BuildUserWorkHistoryResult> {
    const assignmentRows = await this.loadAssignmentSnapshots(dto.userId, trx)
    const reviewFacts = await this.loadReviewFacts(dto.userId, assignmentRows, trx)

    if (dto.fullRebuild) {
      await this.deleteExistingWorkHistory(dto.userId, trx)
    }

    const materialized = await this.materializeWorkHistory(
      dto.userId,
      assignmentRows,
      reviewFacts,
      trx
    )

    const auditWrite = () =>
      this.auditBuildSummary(
        dto.userId,
        dto.fullRebuild ?? false,
        assignmentRows.length,
        materialized.inserted,
        materialized.updated,
        trx
      )
    if (auditOptions.deferAuditWrite) {
      auditOptions.deferAuditWrite(auditWrite)
    } else {
      await auditWrite()
    }

    return {
      userId: dto.userId,
      totalCompletedAssignments: assignmentRows.length,
      inserted: materialized.inserted,
      updated: materialized.updated,
    }
  }

  private toDateTime(value: Date | string | null): DateTime | null {
    if (!value) return null

    if (value instanceof Date) {
      return DateTime.fromJSDate(value)
    }

    const parsed = DateTime.fromISO(value)
    return parsed.isValid ? parsed : null
  }

  private async loadAssignmentSnapshots(
    userId: string,
    trx: UserTransaction
  ): Promise<UserCompletedAssignmentFact[]> {
    return this.completedAssignmentFactReader.listCompletedAssignmentFacts(userId, trx)
  }

  private async deleteExistingWorkHistory(
    userId: string,
    trx: UserTransaction
  ): Promise<void> {
    await this.profiles.deleteWorkHistoryByUser(userId, trx)
  }

  private async loadReviewFacts(
    userId: string,
    assignments: UserCompletedAssignmentFact[],
    trx: UserTransaction
  ): Promise<Map<string, UserProfileReviewFact>> {
    const assignmentIds = assignments.map((assignment) => assignment.taskAssignmentId)
    const facts = await this.profileReviewFactReader.listProfileReviewFacts(
      userId,
      assignmentIds,
      trx
    )

    return new Map(facts.map((fact) => [fact.taskAssignmentId, fact]))
  }

  private buildAssignmentAnalytics(
    assignment: UserCompletedAssignmentFact,
    reviewFact: UserProfileReviewFact | undefined
  ): AssignmentAnalytics {
    const completedAt = this.toDateTime(assignment.completedAt)

    if (!reviewFact || reviewFact.disposition === 'tombstone') {
      return {
        completedAt,
        overallQualityScore: null,
        skillScores: [],
        evidenceLinks: [],
        knowledgeArtifacts: [],
      }
    }

    return {
      completedAt,
      overallQualityScore: reviewFact.overallQualityScore,
      skillScores: reviewFact.skillRatings.map((rating) => ({
        skill_id: rating.skillId,
        skill_name: rating.skillName,
        assigned_public_proficiency_code: rating.assignedPublicProficiencyCode,
        reviewer_type: rating.reviewerType,
      })),
      evidenceLinks: reviewFact.evidences.map((evidence) => ({
        evidence_id: evidence.evidenceId,
        evidence_type: evidence.evidenceType,
        url: evidence.url,
        title: evidence.title,
      })),
      knowledgeArtifacts: [],
    }
  }

  private buildWorkHistoryPayload(
    assignment: UserCompletedAssignmentFact,
    analytics: AssignmentAnalytics
  ): WorkHistoryPayload {
    const dueDate = this.toDateTime(assignment.dueDate)
    const { wasOnTime, daysEarlyOrLate } = calculateWorkHistoryDeliveryTiming({
      dueDate: dueDate?.toJSDate() ?? null,
      completedAt: analytics.completedAt?.toJSDate() ?? null,
    })

    return {
      task_id: assignment.taskId,
      task_assignment_id: assignment.taskAssignmentId,
      organization_id: assignment.organizationId,
      project_id: assignment.projectId,
      task_title: assignment.taskTitle,
      task_type: assignment.taskType,
      business_domain: assignment.businessDomain,
      problem_category: assignment.problemCategory,
      role_in_task: assignment.roleInTask,
      autonomy_level: assignment.autonomyLevel,
      collaboration_type: assignment.collaborationType,
      tech_stack: assignment.techStack,
      domain_tags: assignment.domainTags,
      difficulty: assignment.difficulty,
      estimated_hours: assignment.assignmentEstimatedHours ?? assignment.estimatedTime,
      actual_hours: assignment.assignmentActualHours ?? assignment.actualTime,
      was_on_time: wasOnTime,
      days_early_or_late: daysEarlyOrLate,
      measurable_outcomes: assignment.measurableOutcomes,
      estimated_business_value: assignment.impactScope,
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
    userId: string,
    payload: WorkHistoryPayload,
    trx: UserTransaction
  ): Promise<'inserted' | 'updated'> {
    const existing = await this.profiles.findWorkHistory(
      userId,
      payload.task_assignment_id,
      trx
    )

    if (existing) {
      await this.profiles.updateWorkHistory(
        existing.id,
        {
        ...payload,
        is_featured: existing.is_featured,
        is_public: existing.is_public,
        },
        trx
      )
      return 'updated'
    }

    await this.profiles.createWorkHistory(
      {
        user_id: userId,
        ...payload,
      },
      trx
    )
    return 'inserted'
  }

  private async materializeWorkHistory(
    userId: string,
    assignmentRows: UserCompletedAssignmentFact[],
    reviewFacts: Map<string, UserProfileReviewFact>,
    trx: UserTransaction
  ): Promise<MaterializedWorkHistoryBatch> {
    let inserted = 0
    let updated = 0

    for (const assignment of assignmentRows) {
      const analytics = this.buildAssignmentAnalytics(
        assignment,
        reviewFacts.get(assignment.taskAssignmentId)
      )
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
    userId: string,
    fullRebuild: boolean,
    totalCompletedAssignments: number,
    inserted: number,
    updated: number,
    trx: UserTransaction
  ): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(
        this.execCtx,
        {
          user_id: this.execCtx.userId,
          action: 'build_user_work_history',
          critical: true,
          entity_type: 'user_work_history',
          entity_id: userId,
          old_values: null,
          new_values: {
            full_rebuild: fullRebuild,
            total_completed_assignments: totalCompletedAssignments,
            inserted,
            updated,
          },
        },
        trx
      )
    }
  }
}
