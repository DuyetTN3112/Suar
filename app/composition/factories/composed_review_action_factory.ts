import type { ReviewAiDisputeActionFactory } from '#composition/reviews/disputes/factories/review_ai_dispute_action_factory'
import type { ReviewDisputeActionFactory } from '#composition/reviews/disputes/factories/review_dispute_action_factory'
import type { ReviewEventActionFactory } from '#composition/reviews/events/factories/review_event_action_factory'
import type { ReviewSprintActionFactory } from '#composition/reviews/sprints/factories/review_sprint_action_factory'
import type { ReviewTaskActionFactory } from '#composition/reviews/tasks/factories/review_task_action_factory'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ComposedReviewActionFactories {
  aiDispute: ReviewAiDisputeActionFactory
  dispute: ReviewDisputeActionFactory
  event: ReviewEventActionFactory
  sprint: ReviewSprintActionFactory
  task: ReviewTaskActionFactory
}

/**
 * Stable ReviewActionFactory facade.
 *
 * Construction policy is split into bounded, composition-owned collaborators;
 * controllers continue to depend on the single inbound application contract.
 */
export default class ComposedReviewActionFactory extends ReviewActionFactory {
  constructor(private readonly factories: ComposedReviewActionFactories) {
    super()
  }

  makeWorkflowNavigationQuery() {
    return this.factories.sprint.makeWorkflowNavigationQuery()
  }

  makeGetSprintReverseReviewPageQuery(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeGetSprintReverseReviewPageQuery(execCtx)
  }

  makeGetSprintReviewPackageDetailQuery(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeGetSprintReviewPackageDetailQuery(execCtx)
  }

  makeAcceptSprintReverseReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeAcceptSprintReverseReviewWorkflowCommand(execCtx)
  }

  makeReportSprintReverseReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeReportSprintReverseReviewWorkflowCommand(execCtx)
  }

  makeRespondSprintReverseReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeRespondSprintReverseReviewWorkflowCommand(execCtx)
  }

  makeSubmitSprintReverseReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeSubmitSprintReverseReviewWorkflowCommand(execCtx)
  }

  makeCreateSprintReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeCreateSprintReviewDisputeCommand(execCtx)
  }

  makeCreateSprintReviewDisputeCommentCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeCreateSprintReviewDisputeCommentCommand(execCtx)
  }

  makeReportSprintReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeReportSprintReviewDisputeCommand(execCtx)
  }

  makeGetSprintReviewDisputeDetailQuery(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeGetSprintReviewDisputeDetailQuery(execCtx)
  }

  makeCloseProjectSprintReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeCloseProjectSprintReviewCommand(execCtx)
  }

  makeSubmitSprintReviewPackageCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeSubmitSprintReviewPackageCommand(execCtx)
  }

  makeProcessAiDisputeCallbackCommand() {
    return this.factories.aiDispute.makeProcessAiDisputeCallbackCommand()
  }

  makeSaveAiDisputeFeedbackCommand(execCtx: ReviewActionContext) {
    return this.factories.aiDispute.makeSaveAiDisputeFeedbackCommand(execCtx)
  }

  makeAcceptTaskReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeAcceptTaskReviewCommand(execCtx)
  }

  makeFinalizeTaskReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeFinalizeTaskReviewWorkflowCommand(execCtx)
  }

  makeReportTaskReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeReportTaskReviewDisputeCommand(execCtx)
  }

  makeOpenTaskReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeOpenTaskReviewDisputeCommand(execCtx)
  }

  makeRespondToTaskReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeRespondToTaskReviewCommand(execCtx)
  }

  makeEnsureTaskReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeEnsureTaskReviewWorkflowCommand(execCtx)
  }

  makeSubmitTaskReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeSubmitTaskReviewCommand(execCtx)
  }

  makeSubmitTaskReviewWorkflowCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeSubmitTaskReviewWorkflowCommand(execCtx)
  }

  makeCreateReviewSessionCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeCreateReviewSessionCommand(execCtx)
  }

  makeCreateReviewDisputeCommentCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeCreateReviewDisputeCommentCommand(execCtx)
  }

  makeCreateReviewDisputeEvidenceCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeCreateReviewDisputeEvidenceCommand(execCtx)
  }

  makeRespondToReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeRespondToReviewDisputeCommand(execCtx)
  }

  makeBuildReviewDisputeCaseFileCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeBuildReviewDisputeCaseFileCommand(execCtx)
  }

  makeReportReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeReportReviewDisputeCommand(execCtx)
  }

  makeAddReviewEvidenceCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeAddReviewEvidenceCommand(execCtx)
  }

  makeCreateReviewObservationCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeCreateReviewObservationCommand(execCtx)
  }

  makeUpsertTaskSelfAssessmentCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeUpsertTaskSelfAssessmentCommand(execCtx)
  }

  makeGetTaskReviewBoardQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeGetTaskReviewBoardQuery(execCtx)
  }

  makeGetTaskReviewBoardPageQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeGetTaskReviewBoardPageQuery(execCtx)
  }

  makeGetReviewEvidencesQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeGetReviewEvidencesQuery(execCtx)
  }

  makeGetAdminReviewDisputeDetailQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeGetAdminReviewDisputeDetailQuery(execCtx)
  }

  makeGetTaskSelfAssessmentQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeGetTaskSelfAssessmentQuery(execCtx)
  }

  makeGetUserReviewsQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeGetUserReviewsQuery(execCtx)
  }

  makeStartAiDisputeEvaluationCommand(execCtx: ReviewActionContext) {
    return this.factories.aiDispute.makeStartAiDisputeEvaluationCommand(execCtx)
  }

  makeResolveFlaggedReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeResolveFlaggedReviewCommand(execCtx)
  }

  makeSubmitSkillReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeSubmitSkillReviewCommand(execCtx)
  }

  makeListUserReviewHistoryQuery(execCtx: ReviewActionContext) {
    return this.factories.task.makeListUserReviewHistoryQuery(execCtx)
  }

  makeListOrgReviewDisputesQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeListOrgReviewDisputesQuery(execCtx)
  }

  makeListAiDisputeEvaluationsQuery(execCtx: ReviewActionContext) {
    return this.factories.aiDispute.makeListAiDisputeEvaluationsQuery(execCtx)
  }

  makeListReviewDisputeCommentsQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeListReviewDisputeCommentsQuery(execCtx)
  }

  makeListReviewDisputeEvidencesQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeListReviewDisputeEvidencesQuery(execCtx)
  }

  makeListPendingSprintReviewPackagesQuery(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeListPendingSprintReviewPackagesQuery(execCtx)
  }

  makeListSprintReviewPackagesQuery(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeListSprintReviewPackagesQuery(execCtx)
  }

  makeSubmitReverseReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.task.makeSubmitReverseReviewCommand(execCtx)
  }

  makeCloseProjectSprintReviewPeriodCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeCloseProjectSprintReviewPeriodCommand(execCtx)
  }

  makeResolveReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeResolveReviewDisputeCommand(execCtx)
  }

  makeApproveAiProfileCapabilityProposalCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeApproveAiProfileCapabilityProposalCommand(execCtx)
  }

  makeExpireSprintReviewPackagesCommand(execCtx: ReviewActionContext) {
    return this.factories.sprint.makeExpireSprintReviewPackagesCommand(execCtx)
  }

  makeConfirmReviewCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeConfirmReviewCommand(execCtx)
  }

  makeListReviewDisputeCaseFilesQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeListReviewDisputeCaseFilesQuery(execCtx)
  }

  makeCreateReviewDisputeCommand(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeCreateReviewDisputeCommand(execCtx)
  }

  makeListAdminReviewDisputesQuery(execCtx: ReviewActionContext) {
    return this.factories.dispute.makeListAdminReviewDisputesQuery(execCtx)
  }

  makeProcessReviewSubmittedEventCommand() {
    return this.factories.event.makeProcessReviewSubmittedEventCommand()
  }

  makeProcessReviewConfirmedEventCommand() {
    return this.factories.event.makeProcessReviewConfirmedEventCommand()
  }

  makeProcessDisputeResolvedEventCommand() {
    return this.factories.event.makeProcessDisputeResolvedEventCommand()
  }
}
