import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { AdonisReviewExternalEffectPublisher } from '#composition/adapters/platform/adonis_review_external_effect_publisher'
import { reviewActionFactory } from '#composition/reviews/review-core/review_action_factory'
import type {
  CloseProjectSprintReviewDTO,
  CloseProjectSprintReviewResult,
} from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import EnsureTaskReviewWorkflowCommand, {
  type EnsureTaskReviewWorkflowResult,
} from '#modules/reviews/actions/commands/task-review/ensure_task_review_workflow_command'
import ResolveFlaggedReviewCommand, {
  type ResolveFlaggedReviewDTO,
} from '#modules/reviews/actions/commands/moderation/resolve_flagged_review_command'
import {
  assembleFlaggedReviewModerationProjections,
  collectFlaggedReviewModerationProjectionIds,
  type FlaggedReviewModerationSource,
} from '#modules/reviews/actions/mappers/flagged_review_moderation_projection_mapper'
import type { ReviewUserSkillWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type {
  ProfileReviewFactSourceReader,
  SelfAssessmentAccuracyFactSourceReader,
  TalentExplainabilityFactSourceReader,
} from '#modules/reviews/actions/ports/outbound/review_fact_source_readers'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import ListProfileReviewFactsV1Query from '#modules/reviews/actions/queries/review-core/list_profile_review_facts_v1_query'
import ListSelfAssessmentAccuracyFactsV1Query from '#modules/reviews/actions/queries/self-assessment/list_self_assessment_accuracy_facts_v1_query'
import ListTalentExplainabilityProjectionsV1Query from '#modules/reviews/actions/queries/review-core/list_talent_explainability_projections_v1_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  LucidProfileReviewFactSourceReader,
  LucidSelfAssessmentAccuracyFactSourceReader,
  LucidTalentExplainabilityFactSourceReader,
} from '#modules/reviews/infra/adapters/review-core/lucid_review_fact_source_readers'
import LucidReviewFlaggedModerationUnitOfWork from '#modules/reviews/infra/adapters/review-core/lucid_review_flagged_moderation_unit_of_work'
import { LucidReviewMetricsReader } from '#modules/reviews/infra/adapters/review-core/lucid_review_metrics_reader'
import LucidReviewTaskWorkflowUnitOfWork from '#modules/reviews/infra/adapters/task-review/lucid_review_task_workflow_unit_of_work'
import { stageTalentExplainabilityProjectionBackfillV1 } from '#modules/reviews/infra/adapters/self-assessment/lucid_talent_explainability_projection_stager'
import * as flaggedReviewQueries from '#modules/reviews/infra/repositories/read/flagged_review_queries'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'
import {
  loadReverseReviewTargetStats,
  loadUserReverseReviewSummary,
} from '#modules/reviews/infra/repositories/task-review/reverse_review_target_stats_repository'
import ReviewEvidenceRepository from '#modules/reviews/infra/repositories/review-submission/review_evidence_repository'
import ReviewSessionRepository from '#modules/reviews/infra/repositories/review-session/review_session_repository'
import type { ProfileReviewFactV1 } from '#modules/reviews/public_contracts/profile_review_fact_v1'
import type {
  ReverseReviewPersonSummary,
  ReverseReviewTargetStatsRecord,
  ReverseReviewTargetType,
} from '#modules/reviews/public_contracts/reverse_review_stats'
import type {
  SelfAssessmentAccuracyFactV1,
  SelfAssessmentAccuracyPeriodV1,
} from '#modules/reviews/public_contracts/self_assessment_accuracy_fact_v1'
import type { TalentExplainabilityReviewProjectionV1 } from '#modules/reviews/public_contracts/talent_explainability_projection_v1'

export class ReviewPublicApi {
  constructor(
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: ReviewExternalEffectPublisher,
    private readonly profileFactSources: ProfileReviewFactSourceReader,
    private readonly selfAssessmentFactSources: SelfAssessmentAccuracyFactSourceReader,
    private readonly talentFactSources: TalentExplainabilityFactSourceReader,
    private readonly taskWorkflows: LucidReviewTaskWorkflowUnitOfWork
  ) {}

  async hasAnyForTaskAssignmentIds(
    taskAssignmentIds: string[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return ReviewSessionRepository.hasAnyForTaskAssignmentIds(taskAssignmentIds, trx)
  }

  async countPendingForTaskAssignmentIds(
    taskAssignmentIds: string[],
    trx?: TransactionClientContract
  ): Promise<number> {
    return ReviewSessionRepository.countPendingForTaskAssignmentIds(taskAssignmentIds, trx)
  }

  async getTaskReviewDetail(taskId: string): Promise<Record<string, unknown> | null> {
    return getTaskReviewDetailByTask(taskId)
  }

  async ensureTaskReviewWorkflow(
    taskId: string,
    taskAssignmentId: string,
    execCtx: ReviewActionContext,
    trx?: TransactionClientContract
  ): Promise<EnsureTaskReviewWorkflowResult> {
    const command = new EnsureTaskReviewWorkflowCommand(execCtx, this.taskWorkflows)
    const input = { taskId, taskAssignmentId }
    return trx ? command.executeWithTransaction(input, trx) : command.execute(input)
  }

  async listEvidencesBySession(reviewSessionId: string, trx?: TransactionClientContract) {
    return ReviewEvidenceRepository.listBySession(reviewSessionId, trx)
  }

  async listProfileReviewFactsV1(
    revieweeUserId: string,
    taskAssignmentIds: string[],
    trx?: TransactionClientContract
  ): Promise<ProfileReviewFactV1[]> {
    return new ListProfileReviewFactsV1Query(this.profileFactSources).execute(
      revieweeUserId,
      taskAssignmentIds,
      trx
    )
  }

  async listSelfAssessmentAccuracyFactsV1(
    userId: string,
    period: SelfAssessmentAccuracyPeriodV1,
    trx?: TransactionClientContract
  ): Promise<SelfAssessmentAccuracyFactV1[]> {
    return new ListSelfAssessmentAccuracyFactsV1Query(this.selfAssessmentFactSources).execute(
      userId,
      period,
      trx
    )
  }

  async listTalentExplainabilityProjectionsV1(
    revieweeUserIds: string[],
    trx?: TransactionClientContract
  ): Promise<TalentExplainabilityReviewProjectionV1[]> {
    return new ListTalentExplainabilityProjectionsV1Query(this.talentFactSources).execute(
      revieweeUserIds,
      trx
    )
  }

  async stageTalentExplainabilityProjectionBackfillV1(
    revieweeUserIds: string[],
    occurredAt: string
  ): Promise<number> {
    return db.transaction((trx) =>
      stageTalentExplainabilityProjectionBackfillV1({
        trx,
        revieweeUserIds,
        occurredAt,
      })
    )
  }

  async loadReverseReviewTargetStats(
    targetType: ReverseReviewTargetType,
    targetId: string,
    trx?: TransactionClientContract
  ): Promise<ReverseReviewTargetStatsRecord | null> {
    return loadReverseReviewTargetStats(targetType, targetId, trx)
  }

  async loadUserReverseReviewSummary(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ReverseReviewPersonSummary | null> {
    return loadUserReverseReviewSummary(userId, trx)
  }

  async listUserReviewHistory(execCtx: ReviewActionContext) {
    return reviewActionFactory.makeListUserReviewHistoryQuery(execCtx).handle()
  }

  async closeProjectSprintReview(
    input: CloseProjectSprintReviewDTO,
    execCtx: ReviewActionContext
  ): Promise<CloseProjectSprintReviewResult> {
    return reviewActionFactory.makeCloseProjectSprintReviewCommand(execCtx).execute(input)
  }

  async paginateFlaggedReviewsForAdmin(
    page: number,
    perPage: number,
    status: string | undefined,
    after: string | undefined,
    before: string | undefined,
    filters:
      | {
          search?: string
          flagType?: string
          severity?: string
        }
      | undefined,
    moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    skillIdentityReader: ReviewSkillIdentityReader,
    assignmentProjectionReader: ReviewAssignmentProjectionReader
  ) {
    const reviewerIds = filters?.search
      ? await moderatorIdentityReader.findIdsByUsername(filters.search)
      : undefined
    const result = await flaggedReviewQueries.paginateWithRelations(
      page,
      perPage,
      status,
      after,
      before,
      undefined,
      {
        ...(reviewerIds !== undefined ? { reviewerIds } : {}),
        ...(filters?.flagType ? { flagType: filters.flagType } : {}),
        ...(filters?.severity ? { severity: filters.severity } : {}),
      }
    )
    const { identityIds, skillIds, assignmentIds } = collectFlaggedReviewModerationProjectionIds(
      result.data
    )
    const [identities, skills, assignments] = await Promise.all([
      moderatorIdentityReader.findByIds(identityIds),
      skillIdentityReader.findSkillsByIds(skillIds),
      assignmentProjectionReader.findReviewAssignmentContextsV1(assignmentIds),
    ])
    const data = assembleFlaggedReviewModerationProjections(result.data, {
      identities,
      skills,
      assignments,
    })
    return { ...result, data }
  }

  async getFlaggedReviewAdminDetail(
    id: string,
    moderatorIdentityReader: ReviewModeratorIdentityProjectionReader,
    skillIdentityReader: ReviewSkillIdentityReader,
    assignmentProjectionReader: ReviewAssignmentProjectionReader
  ) {
    const flaggedReview = await flaggedReviewQueries.findAdminDetail(id)
    if (!flaggedReview) return null

    const sources: FlaggedReviewModerationSource[] = [flaggedReview]
    const { identityIds, skillIds, assignmentIds } =
      collectFlaggedReviewModerationProjectionIds(sources)
    const [identities, skills, assignments] = await Promise.all([
      moderatorIdentityReader.findByIds(identityIds),
      skillIdentityReader.findSkillsByIds(skillIds),
      assignmentProjectionReader.findReviewAssignmentContextsV1(assignmentIds),
    ])
    const [projection] = assembleFlaggedReviewModerationProjections(sources, {
      identities,
      skills,
      assignments,
    })
    return projection ?? null
  }

  async countPendingFlaggedReviews(): Promise<number> {
    return flaggedReviewQueries.countPending()
  }

  async resolveFlaggedReview(
    input: ResolveFlaggedReviewDTO,
    execCtx: ReviewActionContext,
    userSkillWriter: ReviewUserSkillWriter
  ): Promise<void> {
    await new ResolveFlaggedReviewCommand(
      execCtx,
      userSkillWriter,
      this.metricsReader,
      this.externalEffects,
      new LucidReviewFlaggedModerationUnitOfWork()
    ).handle(input)
  }
}

export const reviewPublicApi = new ReviewPublicApi(
  new LucidReviewMetricsReader(),
  new AdonisReviewExternalEffectPublisher(),
  new LucidProfileReviewFactSourceReader(),
  new LucidSelfAssessmentAccuracyFactSourceReader(),
  new LucidTalentExplainabilityFactSourceReader(),
  new LucidReviewTaskWorkflowUnitOfWork()
)
