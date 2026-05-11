import { AdonisReviewExternalEffectPublisher } from '#composition/adapters/platform/adonis_review_external_effect_publisher'
import { reviewEventProcessing } from '#composition/adapters/events/review_event_processing'
import { SkillReviewIdentityReaderAdapter } from '#composition/adapters/skills/skill_review_identity_reader_adapter'
import { TaskReviewAssignmentProjectionReaderAdapter } from '#composition/adapters/tasks/task_review_assignment_projection_reader_adapter'
import { TaskReviewCompletedAssignmentReaderAdapter } from '#composition/adapters/tasks/task_review_completed_assignment_reader_adapter'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '#composition/adapters/users/user_review_moderator_identity_projection_reader_adapter'
import ComposedReviewActionFactory from '#composition/factories/composed_review_action_factory'
import { ReviewAiDisputeActionFactory } from '#composition/reviews/disputes/factories/review_ai_dispute_action_factory'
import { ReviewDisputeActionFactory } from '#composition/reviews/disputes/factories/review_dispute_action_factory'
import { ReviewEventActionFactory } from '#composition/reviews/events/factories/review_event_action_factory'
import { ReviewSprintActionFactory } from '#composition/reviews/sprints/factories/review_sprint_action_factory'
import { ReviewTaskActionFactory } from '#composition/reviews/tasks/factories/review_task_action_factory'
import { aiDisputeEvaluationGateway } from '#composition/reviews/disputes/review_ai_dispute_composition'
import { reviewExternalDependencies } from '#composition/reviews/review-core/review_external_dependencies_composition'
import CalculatePerformanceScoreCommand from '#modules/reviews/actions/commands/review-core/calculate_performance_score_command'
import CalculateSpiderChartCommand from '#modules/reviews/actions/commands/review-core/calculate_spider_chart_command'
import CalculateTrustScoreCommand from '#modules/reviews/actions/commands/review-core/calculate_trust_score_command'
import DetectAnomalyCommand from '#modules/reviews/actions/commands/moderation/detect_anomaly_command'
import type ProcessDisputeResolvedEventCommand from '#modules/reviews/actions/commands/disputes/process_dispute_resolved_event_command'
import type ProcessReviewConfirmedEventCommand from '#modules/reviews/actions/commands/review-submission/process_review_confirmed_event_command'
import type ProcessReviewSubmittedEventCommand from '#modules/reviews/actions/commands/review-submission/process_review_submitted_event_command'
import RecalculateRevieweeSkillScoresCommand from '#modules/reviews/actions/commands/review-submission/recalculate_reviewee_skill_scores_command'
import type ResolveFlaggedReviewCommand from '#modules/reviews/actions/commands/moderation/resolve_flagged_review_command'
import type SubmitSkillReviewCommand from '#modules/reviews/actions/commands/review-submission/submit_skill_review_command'
import UpdateReviewerCredibilityCommand from '#modules/reviews/actions/commands/review-submission/update_reviewer_credibility_command'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidAiDisputeEvaluationSourceReader from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_evaluation_source_reader'
import LucidAiDisputeUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_unit_of_work'
import LucidAiProfileAssessmentApprovalUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_ai_profile_assessment_approval_unit_of_work'
import LucidReviewAdminDisputeReadModel from '#modules/reviews/infra/adapters/disputes/lucid_review_admin_dispute_read_model'
import LucidReviewAnomalyFlagWriter from '#modules/reviews/infra/adapters/review-core/lucid_review_anomaly_flag_writer'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_confirmation_dispute_unit_of_work'
import LucidReviewDisputeArtifactReader from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_artifact_reader'
import LucidReviewDisputeCaseFileUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_case_file_unit_of_work'
import LucidReviewDisputeResolutionUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_resolution_unit_of_work'
import LucidReviewDisputeUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_review_dispute_unit_of_work'
import { LucidTalentExplainabilityFactSourceReader } from '#modules/reviews/infra/adapters/review-core/lucid_review_fact_source_readers'
import LucidReviewFlaggedModerationUnitOfWork from '#modules/reviews/infra/adapters/review-core/lucid_review_flagged_moderation_unit_of_work'
import { LucidReviewMetricsReader } from '#modules/reviews/infra/adapters/review-core/lucid_review_metrics_reader'
import LucidReviewOrgDisputeReader from '#modules/reviews/infra/adapters/disputes/lucid_review_org_dispute_reader'
import LucidReviewSessionArtifactUnitOfWork from '#modules/reviews/infra/adapters/review-session/lucid_review_session_artifact_unit_of_work'
import LucidReviewSessionCreationUnitOfWork from '#modules/reviews/infra/adapters/review-session/lucid_review_session_creation_unit_of_work'
import { LucidReviewSessionReadStore } from '#modules/reviews/infra/adapters/review-session/lucid_review_session_readers'
import LucidReviewSprintLifecycleUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_lifecycle_unit_of_work'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import LucidReviewSprintPackageReader from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_reader'
import LucidReviewSprintReverseBoardReader from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_reverse_board_reader'
import LucidReviewSprintReverseWorkflowUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_reverse_workflow_unit_of_work'
import LucidReviewSubmissionUnitOfWork from '#modules/reviews/infra/adapters/review-submission/lucid_review_submission_unit_of_work'
import { LucidReviewTaskBoardReader } from '#modules/reviews/infra/adapters/task-review/lucid_review_task_board_reader'
import LucidReviewTaskWorkflowUnitOfWork from '#modules/reviews/infra/adapters/task-review/lucid_review_task_workflow_unit_of_work'
import { LucidReviewTransactionRunner } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import LucidReviewUserHistoryReader from '#modules/reviews/infra/adapters/review-core/lucid_review_user_history_reader'
import LucidSprintReviewDisputeUnitOfWork from '#modules/reviews/infra/adapters/disputes/lucid_sprint_review_dispute_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import LucidReviewObservationAuthoringContextReader from '#modules/reviews/infra/adapters/observation/lucid_review_observation_authoring_context_reader'
import { reviewCachePortImpl } from '#modules/reviews/infra/adapters/review-core/review_cache_adapter'
import ReviewSprintBoardPageReader from '#modules/reviews/infra/adapters/sprint-review/review_sprint_board_page_reader'
import ReviewWorkflowNavigationReader from '#modules/reviews/infra/adapters/task-review/review_workflow_navigation_reader'
import { reviewObservationRepository } from '#modules/reviews/infra/repositories/observation/review_observation_repository'

const aiDisputeAppUrl = (process.env['APP_URL'] ?? 'http://localhost:3333').replace(/\/+$/u, '')
const reviewWorkflowNavigationReader = new ReviewWorkflowNavigationReader()
const reviewSprintBoardPageReader = new ReviewSprintBoardPageReader()
export const aiDisputeEvaluationSourceReader = new LucidAiDisputeEvaluationSourceReader()
export const reviewMetricsReader = new LucidReviewMetricsReader()
export const reviewExternalEffects = new AdonisReviewExternalEffectPublisher()
const reviewTaskBoardReader = new LucidReviewTaskBoardReader()
export const reviewTalentFactSources = new LucidTalentExplainabilityFactSourceReader()
export const reviewSessionReads = new LucidReviewSessionReadStore()
export const reviewOrgDisputeReader = new LucidReviewOrgDisputeReader()
export const reviewAdminDisputeReadModel = new LucidReviewAdminDisputeReadModel()
const reviewAnomalyFlags = new LucidReviewAnomalyFlagWriter()
const reviewTransactions = new LucidReviewTransactionRunner()
const reviewCryptography = new NodeReviewCryptography()
const reviewDisputeArtifacts = new LucidReviewDisputeArtifactReader()
const reviewDisputeUnitOfWork = new LucidReviewDisputeUnitOfWork()
const reviewSprintPackages = new LucidReviewSprintPackageReader()
const reviewSprintDisputes = new LucidSprintReviewDisputeUnitOfWork()
const reviewUserHistory = new LucidReviewUserHistoryReader()
const reviewDisputeCaseFiles = new LucidReviewDisputeCaseFileUnitOfWork()
const reviewSessionArtifacts = new LucidReviewSessionArtifactUnitOfWork()
const reviewSprintReverseBoard = new LucidReviewSprintReverseBoardReader()
const reviewSprintLifecycle = new LucidReviewSprintLifecycleUnitOfWork()
const reviewConfirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()
const reviewSessionCreation = new LucidReviewSessionCreationUnitOfWork()
const reviewAiDisputes = new LucidAiDisputeUnitOfWork()
const reviewAiProfileAssessmentApprovals = new LucidAiProfileAssessmentApprovalUnitOfWork()
const reviewSprintReverseWorkflows = new LucidReviewSprintReverseWorkflowUnitOfWork()
const reviewFlaggedModeration = new LucidReviewFlaggedModerationUnitOfWork()
const reviewSprintPackageMutations = new LucidReviewSprintPackageMutationUnitOfWork()
const reviewSubmissionUnitOfWork = new LucidReviewSubmissionUnitOfWork()
const reviewDisputeResolutions = new LucidReviewDisputeResolutionUnitOfWork()
const reviewTaskWorkflows = new LucidReviewTaskWorkflowUnitOfWork()

export const reviewActionFactory = new ComposedReviewActionFactory({
  aiDispute: new ReviewAiDisputeActionFactory({
    gateway: aiDisputeEvaluationGateway,
    runtime: {
      callbackUrl:
        process.env['SUAR_CALLBACK_URL'] ?? `${aiDisputeAppUrl}/api/public/ai-disputes/callback`,
      dispatchImmediately:
        process.env['NODE_ENV'] !== 'test' && process.env['NODE_ENV'] !== 'testing',
    },
    sources: aiDisputeEvaluationSourceReader,
    cryptography: reviewCryptography,
    unitOfWork: reviewAiDisputes,
  }),
  dispute: new ReviewDisputeActionFactory({
    externalDependencies: reviewExternalDependencies,
    metricsReader: reviewMetricsReader,
    aiDisputeSources: aiDisputeEvaluationSourceReader,
    externalEffects: reviewExternalEffects,
    disputeArtifacts: reviewDisputeArtifacts,
    disputeUnitOfWork: reviewDisputeUnitOfWork,
    disputeCaseFiles: reviewDisputeCaseFiles,
    orgDisputes: reviewOrgDisputeReader,
    confirmationDisputes: reviewConfirmationDisputes,
    flaggedModeration: reviewFlaggedModeration,
    adminDisputes: reviewAdminDisputeReadModel,
    disputeResolutions: reviewDisputeResolutions,
    profileAssessmentApprovals: reviewAiProfileAssessmentApprovals,
  }),
  event: new ReviewEventActionFactory({
    externalDependencies: reviewExternalDependencies,
    metricsReader: reviewMetricsReader,
    externalEffects: reviewExternalEffects,
    talentSources: reviewTalentFactSources,
    sessionReads: reviewSessionReads,
    eventProcessing: reviewEventProcessing,
    cryptography: reviewCryptography,
    anomalyFlags: reviewAnomalyFlags,
  }),
  sprint: new ReviewSprintActionFactory({
    workflowNavigation: reviewWorkflowNavigationReader,
    sprintBoardPageReader: reviewSprintBoardPageReader,
    cryptography: reviewCryptography,
    sprintPackages: reviewSprintPackages,
    sprintDisputes: reviewSprintDisputes,
    sprintLifecycle: reviewSprintLifecycle,
    sprintPackageMutations: reviewSprintPackageMutations,
    sprintReverseBoard: reviewSprintReverseBoard,
    sprintReverseWorkflows: reviewSprintReverseWorkflows,
  }),
  task: new ReviewTaskActionFactory({
    externalDependencies: reviewExternalDependencies,
    projectionDependencies: {
      completedAssignmentReader: new TaskReviewCompletedAssignmentReaderAdapter(),
      assignmentProjectionReader: new TaskReviewAssignmentProjectionReaderAdapter(),
      moderatorIdentityReader: new UserReviewModeratorIdentityProjectionReaderAdapter(),
      skillIdentityReader: new SkillReviewIdentityReaderAdapter(),
    },
    workflowNavigation: reviewWorkflowNavigationReader,
    taskBoardReader: reviewTaskBoardReader,
    sessionReads: reviewSessionReads,
    userHistory: reviewUserHistory,
    confirmationDisputes: reviewConfirmationDisputes,
    sessionCreation: reviewSessionCreation,
    sessionArtifacts: reviewSessionArtifacts,
    submissionUnitOfWork: reviewSubmissionUnitOfWork,
    reviewCache: reviewCachePortImpl,
    taskWorkflows: reviewTaskWorkflows,
    observationContexts: new LucidReviewObservationAuthoringContextReader(),
    observationWriter: reviewObservationRepository,
  }),
})

export function makeStartAiDisputeEvaluationCommand(execCtx: ReviewActionContext) {
  return reviewActionFactory.makeStartAiDisputeEvaluationCommand(execCtx)
}

export function makeCalculatePerformanceScoreCommand(
  execCtx: ReviewActionContext
): CalculatePerformanceScoreCommand {
  return new CalculatePerformanceScoreCommand(
    execCtx,
    reviewExternalDependencies.user,
    reviewMetricsReader,
    reviewTransactions
  )
}

export function makeCalculateSpiderChartCommand(
  execCtx: ReviewActionContext
): CalculateSpiderChartCommand {
  return new CalculateSpiderChartCommand(
    execCtx,
    reviewExternalDependencies.skill,
    reviewExternalDependencies.userSkill,
    reviewMetricsReader,
    reviewTransactions
  )
}

export function makeCalculateTrustScoreCommand(
  execCtx: ReviewActionContext
): CalculateTrustScoreCommand {
  return new CalculateTrustScoreCommand(
    execCtx,
    reviewExternalDependencies.organization,
    reviewExternalDependencies.user,
    reviewMetricsReader,
    reviewTransactions
  )
}

export function makeDetectAnomalyCommand(execCtx: ReviewActionContext): DetectAnomalyCommand {
  return new DetectAnomalyCommand(
    execCtx,
    reviewExternalDependencies.user,
    reviewMetricsReader,
    reviewSessionReads,
    reviewAnomalyFlags,
    reviewTransactions
  )
}

export function makeRecalculateRevieweeSkillScoresCommand(
  execCtx: ReviewActionContext
): RecalculateRevieweeSkillScoresCommand {
  return new RecalculateRevieweeSkillScoresCommand(
    execCtx,
    reviewExternalDependencies.userSkill,
    reviewMetricsReader,
    reviewExternalEffects,
    reviewTransactions
  )
}

export function makeResolveFlaggedReviewCommand(
  execCtx: ReviewActionContext
): ResolveFlaggedReviewCommand {
  return reviewActionFactory.makeResolveFlaggedReviewCommand(execCtx)
}

export function makeSubmitSkillReviewCommand(
  execCtx: ReviewActionContext
): SubmitSkillReviewCommand {
  return reviewActionFactory.makeSubmitSkillReviewCommand(execCtx)
}

export function makeUpdateReviewerCredibilityCommand(
  execCtx: ReviewActionContext
): UpdateReviewerCredibilityCommand {
  return new UpdateReviewerCredibilityCommand(
    execCtx,
    reviewExternalDependencies.user,
    reviewMetricsReader,
    reviewTransactions
  )
}

export function makeProcessReviewSubmittedEventCommand(): ProcessReviewSubmittedEventCommand {
  return reviewActionFactory.makeProcessReviewSubmittedEventCommand()
}

export function makeProcessReviewConfirmedEventCommand(): ProcessReviewConfirmedEventCommand {
  return reviewActionFactory.makeProcessReviewConfirmedEventCommand()
}

export function makeProcessDisputeResolvedEventCommand(): ProcessDisputeResolvedEventCommand {
  return reviewActionFactory.makeProcessDisputeResolvedEventCommand()
}
