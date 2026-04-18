import type AcceptSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command'
import type AcceptTaskReviewCommand from '#modules/reviews/actions/commands/accept_task_review_command'
import type AddReviewEvidenceCommand from '#modules/reviews/actions/commands/add_review_evidence_command'
import type BuildReviewDisputeCaseFileCommand from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
import type CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/close_project_sprint_review_command'
import type CloseProjectSprintReviewPeriodCommand from '#modules/reviews/actions/commands/close_project_sprint_review_period_command'
import type ConfirmReviewCommand from '#modules/reviews/actions/commands/confirm_review_command'
import type CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'
import type CreateReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
import type CreateReviewDisputeEvidenceCommand from '#modules/reviews/actions/commands/create_review_dispute_evidence_command'
import type CreateReviewSessionCommand from '#modules/reviews/actions/commands/create_review_session_command'
import type CreateSprintReviewDisputeCommand from '#modules/reviews/actions/commands/create_sprint_review_dispute_command'
import type CreateSprintReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_sprint_review_dispute_comment_command'
import type EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/ensure_task_review_workflow_command'
import type ExpireSprintReviewPackagesCommand from '#modules/reviews/actions/commands/expire_sprint_review_packages_command'
import type ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'
import type ProcessDisputeResolvedEventCommand from '#modules/reviews/actions/commands/process_dispute_resolved_event_command'
import type ProcessReviewConfirmedEventCommand from '#modules/reviews/actions/commands/process_review_confirmed_event_command'
import type ProcessReviewSubmittedEventCommand from '#modules/reviews/actions/commands/process_review_submitted_event_command'
import type ReportReviewDisputeCommand from '#modules/reviews/actions/commands/report_review_dispute_command'
import type ReportSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/report_sprint_reverse_review_workflow_command'
import type ReportSprintReviewDisputeCommand from '#modules/reviews/actions/commands/report_sprint_review_dispute_command'
import type ReportTaskReviewDisputeCommand from '#modules/reviews/actions/commands/report_task_review_dispute_command'
import type ResolveFlaggedReviewCommand from '#modules/reviews/actions/commands/resolve_flagged_review_command'
import type ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import type RespondSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command'
import type RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import type RespondToTaskReviewCommand from '#modules/reviews/actions/commands/respond_to_task_review_command'
import type SaveAiDisputeFeedbackCommand from '#modules/reviews/actions/commands/save_ai_dispute_feedback_command'
import type StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import type SubmitReverseReviewCommand from '#modules/reviews/actions/commands/submit_reverse_review_command'
import type SubmitSkillReviewCommand from '#modules/reviews/actions/commands/submit_skill_review_command'
import type SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command'
import type SubmitSprintReviewPackageCommand from '#modules/reviews/actions/commands/submit_sprint_review_package_command'
import type SubmitTaskReviewCommand from '#modules/reviews/actions/commands/submit_task_review_command'
import type SubmitTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_task_review_workflow_command'
import type UpsertTaskSelfAssessmentCommand from '#modules/reviews/actions/commands/upsert_task_self_assessment_command'
import type GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import type GetReviewEvidencesQuery from '#modules/reviews/actions/queries/get_review_evidences_query'
import type GetReviewWorkflowNavigationQuery from '#modules/reviews/actions/queries/get_review_workflow_navigation_query'
import type GetSprintReverseReviewPageQuery from '#modules/reviews/actions/queries/get_sprint_reverse_review_page_query'
import type GetSprintReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_sprint_review_dispute_detail_query'
import type GetSprintReviewPackageDetailQuery from '#modules/reviews/actions/queries/get_sprint_review_package_detail_query'
import type GetTaskReviewBoardPageQuery from '#modules/reviews/actions/queries/get_task_review_board_page_query'
import type GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/get_task_review_board_query'
import type GetTaskSelfAssessmentQuery from '#modules/reviews/actions/queries/get_task_self_assessment_query'
import type GetUserReviewsQuery from '#modules/reviews/actions/queries/get_user_reviews_query'
import type ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import type ListAiDisputeEvaluationsQuery from '#modules/reviews/actions/queries/list_ai_dispute_evaluations_query'
import type ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import type ListPendingSprintReviewPackagesQuery from '#modules/reviews/actions/queries/list_pending_sprint_review_packages_query'
import type ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import type ListReviewDisputeCommentsQuery from '#modules/reviews/actions/queries/list_review_dispute_comments_query'
import type ListReviewDisputeEvidencesQuery from '#modules/reviews/actions/queries/list_review_dispute_evidences_query'
import type ListSprintReviewPackagesQuery from '#modules/reviews/actions/queries/list_sprint_review_packages_query'
import type ListUserReviewHistoryQuery from '#modules/reviews/actions/queries/list_user_review_history_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

/**
 * Inbound construction contract for request-scoped Review use cases.
 *
 * Controllers depend on this application boundary. The concrete construction
 * policy and outbound dependency graph live in the composition root.
 */
export abstract class ReviewActionFactory {
  abstract makeWorkflowNavigationQuery(): GetReviewWorkflowNavigationQuery
  abstract makeGetSprintReverseReviewPageQuery(
    execCtx: ReviewActionContext
  ): GetSprintReverseReviewPageQuery
  abstract makeGetSprintReviewPackageDetailQuery(
    execCtx: ReviewActionContext
  ): GetSprintReviewPackageDetailQuery
  abstract makeAcceptSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): AcceptSprintReverseReviewWorkflowCommand
  abstract makeReportSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): ReportSprintReverseReviewWorkflowCommand
  abstract makeRespondSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): RespondSprintReverseReviewWorkflowCommand
  abstract makeSubmitSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): SubmitSprintReverseReviewWorkflowCommand
  abstract makeCreateSprintReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): CreateSprintReviewDisputeCommand
  abstract makeCreateSprintReviewDisputeCommentCommand(
    execCtx: ReviewActionContext
  ): CreateSprintReviewDisputeCommentCommand
  abstract makeReportSprintReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): ReportSprintReviewDisputeCommand
  abstract makeGetSprintReviewDisputeDetailQuery(
    execCtx: ReviewActionContext
  ): GetSprintReviewDisputeDetailQuery
  abstract makeCloseProjectSprintReviewCommand(
    execCtx: ReviewActionContext
  ): CloseProjectSprintReviewCommand
  abstract makeSubmitSprintReviewPackageCommand(
    execCtx: ReviewActionContext
  ): SubmitSprintReviewPackageCommand
  abstract makeProcessAiDisputeCallbackCommand(): ProcessAiDisputeCallbackCommand
  abstract makeSaveAiDisputeFeedbackCommand(
    execCtx: ReviewActionContext
  ): SaveAiDisputeFeedbackCommand
  abstract makeAcceptTaskReviewCommand(execCtx: ReviewActionContext): AcceptTaskReviewCommand
  abstract makeReportTaskReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): ReportTaskReviewDisputeCommand
  abstract makeRespondToTaskReviewCommand(execCtx: ReviewActionContext): RespondToTaskReviewCommand
  abstract makeEnsureTaskReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): EnsureTaskReviewWorkflowCommand
  abstract makeSubmitTaskReviewCommand(execCtx: ReviewActionContext): SubmitTaskReviewCommand
  abstract makeSubmitTaskReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): SubmitTaskReviewWorkflowCommand
  abstract makeCreateReviewSessionCommand(execCtx: ReviewActionContext): CreateReviewSessionCommand
  abstract makeCreateReviewDisputeCommentCommand(
    execCtx: ReviewActionContext
  ): CreateReviewDisputeCommentCommand
  abstract makeCreateReviewDisputeEvidenceCommand(
    execCtx: ReviewActionContext
  ): CreateReviewDisputeEvidenceCommand
  abstract makeRespondToReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): RespondToReviewDisputeCommand
  abstract makeBuildReviewDisputeCaseFileCommand(
    execCtx: ReviewActionContext
  ): BuildReviewDisputeCaseFileCommand
  abstract makeReportReviewDisputeCommand(execCtx: ReviewActionContext): ReportReviewDisputeCommand
  abstract makeAddReviewEvidenceCommand(execCtx: ReviewActionContext): AddReviewEvidenceCommand
  abstract makeUpsertTaskSelfAssessmentCommand(
    execCtx: ReviewActionContext
  ): UpsertTaskSelfAssessmentCommand
  abstract makeGetTaskReviewBoardPageQuery(
    execCtx: ReviewActionContext
  ): GetTaskReviewBoardPageQuery
  abstract makeGetTaskReviewBoardQuery(execCtx: ReviewActionContext): GetTaskReviewBoardQuery
  abstract makeGetReviewEvidencesQuery(execCtx: ReviewActionContext): GetReviewEvidencesQuery
  abstract makeGetAdminReviewDisputeDetailQuery(
    execCtx: ReviewActionContext
  ): GetAdminReviewDisputeDetailQuery
  abstract makeGetTaskSelfAssessmentQuery(execCtx: ReviewActionContext): GetTaskSelfAssessmentQuery
  abstract makeGetUserReviewsQuery(execCtx: ReviewActionContext): GetUserReviewsQuery
  abstract makeStartAiDisputeEvaluationCommand(
    execCtx: ReviewActionContext
  ): StartAiDisputeEvaluationCommand
  abstract makeResolveFlaggedReviewCommand(
    execCtx: ReviewActionContext
  ): ResolveFlaggedReviewCommand
  abstract makeSubmitSkillReviewCommand(execCtx: ReviewActionContext): SubmitSkillReviewCommand
  abstract makeListUserReviewHistoryQuery(execCtx: ReviewActionContext): ListUserReviewHistoryQuery
  abstract makeListOrgReviewDisputesQuery(execCtx: ReviewActionContext): ListOrgReviewDisputesQuery
  abstract makeListAiDisputeEvaluationsQuery(
    execCtx: ReviewActionContext
  ): ListAiDisputeEvaluationsQuery
  abstract makeListReviewDisputeCommentsQuery(
    execCtx: ReviewActionContext
  ): ListReviewDisputeCommentsQuery
  abstract makeListReviewDisputeEvidencesQuery(
    execCtx: ReviewActionContext
  ): ListReviewDisputeEvidencesQuery
  abstract makeListPendingSprintReviewPackagesQuery(
    execCtx: ReviewActionContext
  ): ListPendingSprintReviewPackagesQuery
  abstract makeListSprintReviewPackagesQuery(
    execCtx: ReviewActionContext
  ): ListSprintReviewPackagesQuery
  abstract makeSubmitReverseReviewCommand(execCtx: ReviewActionContext): SubmitReverseReviewCommand
  abstract makeCloseProjectSprintReviewPeriodCommand(
    execCtx: ReviewActionContext
  ): CloseProjectSprintReviewPeriodCommand
  abstract makeResolveReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): ResolveReviewDisputeCommand
  abstract makeExpireSprintReviewPackagesCommand(
    execCtx: ReviewActionContext
  ): ExpireSprintReviewPackagesCommand
  abstract makeConfirmReviewCommand(execCtx: ReviewActionContext): ConfirmReviewCommand
  abstract makeListReviewDisputeCaseFilesQuery(
    execCtx: ReviewActionContext
  ): ListReviewDisputeCaseFilesQuery
  abstract makeCreateReviewDisputeCommand(execCtx: ReviewActionContext): CreateReviewDisputeCommand
  abstract makeListAdminReviewDisputesQuery(
    execCtx: ReviewActionContext
  ): ListAdminReviewDisputesQuery
  abstract makeProcessReviewSubmittedEventCommand(): ProcessReviewSubmittedEventCommand
  abstract makeProcessReviewConfirmedEventCommand(): ProcessReviewConfirmedEventCommand
  abstract makeProcessDisputeResolvedEventCommand(): ProcessDisputeResolvedEventCommand
}
