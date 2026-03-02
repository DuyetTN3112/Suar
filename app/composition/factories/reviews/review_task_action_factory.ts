import AcceptTaskReviewCommand from '#modules/reviews/actions/commands/accept_task_review_command'
import AddReviewEvidenceCommand from '#modules/reviews/actions/commands/add_review_evidence_command'
import CreateReviewSessionCommand from '#modules/reviews/actions/commands/create_review_session_command'
import EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/ensure_task_review_workflow_command'
import ReportTaskReviewDisputeCommand from '#modules/reviews/actions/commands/report_task_review_dispute_command'
import RespondToTaskReviewCommand from '#modules/reviews/actions/commands/respond_to_task_review_command'
import SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'
import SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'
import SubmitTaskReviewCommand from '#modules/reviews/actions/commands/submit_task_review_command'
import SubmitTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_task_review_workflow_command'
import UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'
import type { ReviewCachePort } from '#modules/reviews/actions/ports/outbound/review_cache_port'
import type { ReviewCompletedAssignmentReader } from '#modules/reviews/actions/ports/outbound/review_completed_assignment_reader'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import type { ReviewSessionArtifactUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_artifact_unit_of_work'
import type { ReviewSessionCreationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_creation_unit_of_work'
import type { ReviewSessionReadStore } from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewSubmissionUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_submission_unit_of_work'
import type { ReviewTaskBoardReader } from '#modules/reviews/actions/ports/outbound/review_task_board_reader'
import type { ReviewTaskWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_task_workflow_unit_of_work'
import type { ReviewUserHistoryReader } from '#modules/reviews/actions/ports/outbound/review_user_history_reader'
import type { ReviewWorkflowNavigationReader } from '#modules/reviews/actions/ports/outbound/review_workflow_navigation_reader'
import GetReviewEvidencesQuery from '#modules/reviews/actions/queries/get_review_evidences_query'
import GetTaskReviewBoardPageQuery from '#modules/reviews/actions/queries/get_task_review_board_page_query'
import GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/get_task_review_board_query'
import GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'
import GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'
import ListUserReviewHistoryQuery from '#modules/reviews/actions/queries/list_user_review_history_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

interface ReviewProjectionDependencies {
  completedAssignmentReader: ReviewCompletedAssignmentReader
  assignmentProjectionReader: ReviewAssignmentProjectionReader
  moderatorIdentityReader: ReviewModeratorIdentityProjectionReader
  skillIdentityReader: ReviewSkillIdentityReader
}

export interface ReviewTaskActionFactoryDependencies {
  externalDependencies: ReviewExternalDependencies
  projectionDependencies?: ReviewProjectionDependencies
  workflowNavigation?: ReviewWorkflowNavigationReader
  taskBoardReader?: ReviewTaskBoardReader
  sessionReads?: ReviewSessionReadStore
  userHistory?: ReviewUserHistoryReader
  confirmationDisputes?: ReviewConfirmationDisputeUnitOfWork
  sessionCreation?: ReviewSessionCreationUnitOfWork
  sessionArtifacts?: ReviewSessionArtifactUnitOfWork
  submissionUnitOfWork?: ReviewSubmissionUnitOfWork
  reviewCache?: ReviewCachePort
  taskWorkflows?: ReviewTaskWorkflowUnitOfWork
}

/**
 * Constructs task-review, review-session, and personal review-history use cases.
 */
export class ReviewTaskActionFactory {
  constructor(private readonly dependencies: ReviewTaskActionFactoryDependencies) {}

  makeAcceptTaskReviewCommand(execCtx: ReviewActionContext): AcceptTaskReviewCommand {
    return new AcceptTaskReviewCommand(execCtx, this.requireConfirmationDisputes())
  }

  makeReportTaskReviewDisputeCommand(execCtx: ReviewActionContext): ReportTaskReviewDisputeCommand {
    return new ReportTaskReviewDisputeCommand(execCtx, this.requireTaskWorkflows())
  }

  makeRespondToTaskReviewCommand(execCtx: ReviewActionContext): RespondToTaskReviewCommand {
    return new RespondToTaskReviewCommand(execCtx, this.requireTaskWorkflows())
  }

  makeEnsureTaskReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): EnsureTaskReviewWorkflowCommand {
    return new EnsureTaskReviewWorkflowCommand(execCtx, this.requireTaskWorkflows())
  }

  makeSubmitTaskReviewCommand(execCtx: ReviewActionContext): SubmitTaskReviewCommand {
    return new SubmitTaskReviewCommand(execCtx, this.requireTaskWorkflows())
  }

  makeSubmitTaskReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): SubmitTaskReviewWorkflowCommand {
    return new SubmitTaskReviewWorkflowCommand(
      new EnsureTaskReviewWorkflowCommand(execCtx, this.requireTaskWorkflows()),
      new SubmitTaskReviewCommand(execCtx, this.requireTaskWorkflows())
    )
  }

  makeCreateReviewSessionCommand(execCtx: ReviewActionContext): CreateReviewSessionCommand {
    const projections = this.requireProjectionDependencies()
    return new CreateReviewSessionCommand(
      execCtx,
      projections.completedAssignmentReader,
      this.requireSessionCreation()
    )
  }

  makeAddReviewEvidenceCommand(execCtx: ReviewActionContext): AddReviewEvidenceCommand {
    return new AddReviewEvidenceCommand(execCtx, this.requireSessionArtifacts())
  }

  makeUpsertTaskSelfAssessmentCommand(
    execCtx: ReviewActionContext
  ): UpsertTaskSelfAssessmentCommand {
    return new UpsertTaskSelfAssessmentCommand(execCtx, this.requireSessionArtifacts())
  }

  makeGetTaskReviewBoardQuery(execCtx: ReviewActionContext): GetTaskReviewBoardQuery {
    return new GetTaskReviewBoardQuery(execCtx, this.requireTaskBoardReader())
  }

  makeGetTaskReviewBoardPageQuery(execCtx: ReviewActionContext): GetTaskReviewBoardPageQuery {
    const pageDependencies = this.requireTaskBoardPageDependencies()
    return new GetTaskReviewBoardPageQuery(
      new GetTaskReviewBoardQuery(execCtx, pageDependencies.taskBoardReader),
      pageDependencies.workflowNavigation
    )
  }

  makeGetReviewEvidencesQuery(execCtx: ReviewActionContext): GetReviewEvidencesQuery {
    return new GetReviewEvidencesQuery(execCtx, this.requireSessionReads())
  }

  makeGetTaskSelfAssessmentQuery(execCtx: ReviewActionContext): GetTaskSelfAssessmentQuery {
    return new GetTaskSelfAssessmentQuery(execCtx, this.requireSessionReads())
  }

  makeGetUserReviewsQuery(execCtx: ReviewActionContext): GetUserReviewsQuery {
    const projections = this.requireProjectionDependencies()
    return new GetUserReviewsQuery(
      execCtx,
      projections.assignmentProjectionReader,
      projections.moderatorIdentityReader,
      projections.skillIdentityReader,
      this.requireSessionReads()
    )
  }

  makeSubmitSkillReviewCommand(execCtx: ReviewActionContext): SubmitSkillReviewCommand {
    return new SubmitSkillReviewCommand(
      execCtx,
      this.dependencies.externalDependencies.skill,
      this.requireSubmissionUnitOfWork(),
      this.requireReviewCache()
    )
  }

  makeListUserReviewHistoryQuery(execCtx: ReviewActionContext): ListUserReviewHistoryQuery {
    return new ListUserReviewHistoryQuery(execCtx, this.requireUserHistory())
  }

  makeSubmitReverseReviewCommand(execCtx: ReviewActionContext): SubmitReverseReviewCommand {
    return new SubmitReverseReviewCommand(execCtx)
  }

  private requireProjectionDependencies(): ReviewProjectionDependencies {
    if (!this.dependencies.projectionDependencies) {
      throw new Error('Review projection capabilities are not configured')
    }
    return this.dependencies.projectionDependencies
  }

  private requireTaskBoardPageDependencies(): {
    taskBoardReader: ReviewTaskBoardReader
    workflowNavigation: ReviewWorkflowNavigationReader
  } {
    if (!this.dependencies.taskBoardReader || !this.dependencies.workflowNavigation) {
      throw new Error('Review task board page capability is not configured')
    }
    return {
      taskBoardReader: this.dependencies.taskBoardReader,
      workflowNavigation: this.dependencies.workflowNavigation,
    }
  }

  private requireTaskBoardReader(): ReviewTaskBoardReader {
    if (!this.dependencies.taskBoardReader) {
      throw new Error('Review task board capability is not configured')
    }
    return this.dependencies.taskBoardReader
  }

  private requireSessionReads(): ReviewSessionReadStore {
    if (!this.dependencies.sessionReads) {
      throw new Error('Review session read capability is not configured')
    }
    return this.dependencies.sessionReads
  }

  private requireUserHistory(): ReviewUserHistoryReader {
    if (!this.dependencies.userHistory) {
      throw new Error('Review user history read capability is not configured')
    }
    return this.dependencies.userHistory
  }

  private requireConfirmationDisputes(): ReviewConfirmationDisputeUnitOfWork {
    if (!this.dependencies.confirmationDisputes) {
      throw new Error('Review confirmation and dispute capability is not configured')
    }
    return this.dependencies.confirmationDisputes
  }

  private requireSessionCreation(): ReviewSessionCreationUnitOfWork {
    if (!this.dependencies.sessionCreation) {
      throw new Error('Review session creation capability is not configured')
    }
    return this.dependencies.sessionCreation
  }

  private requireSessionArtifacts(): ReviewSessionArtifactUnitOfWork {
    if (!this.dependencies.sessionArtifacts) {
      throw new Error('Review session artifact capability is not configured')
    }
    return this.dependencies.sessionArtifacts
  }

  private requireSubmissionUnitOfWork(): ReviewSubmissionUnitOfWork {
    if (!this.dependencies.submissionUnitOfWork) {
      throw new Error('Review submission capability is not configured')
    }
    return this.dependencies.submissionUnitOfWork
  }

  private requireReviewCache(): ReviewCachePort {
    if (!this.dependencies.reviewCache) {
      throw new Error('Review cache capability is not configured')
    }
    return this.dependencies.reviewCache
  }

  private requireTaskWorkflows(): ReviewTaskWorkflowUnitOfWork {
    if (!this.dependencies.taskWorkflows) {
      throw new Error('Review task workflow capability is not configured')
    }
    return this.dependencies.taskWorkflows
  }
}
