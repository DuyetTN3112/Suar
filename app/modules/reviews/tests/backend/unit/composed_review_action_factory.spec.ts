import { test } from '@japa/runner'

import { reviewActionFactory } from '#composition/review_action_factory'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

const execCtx: ReviewActionContext = {
  userId: '00000000-0000-0000-0000-000000000001',
  ip: '127.0.0.1',
  userAgent: 'review-factory-construction-test',
  organizationId: '00000000-0000-0000-0000-000000000002',
}

test.group('Composed Review action factory', () => {
  test('constructs every use case exposed by the stable inbound contract', ({ assert }) => {
    const useCases = [
      reviewActionFactory.makeWorkflowNavigationQuery(),
      reviewActionFactory.makeGetSprintReverseReviewPageQuery(execCtx),
      reviewActionFactory.makeGetSprintReviewPackageDetailQuery(execCtx),
      reviewActionFactory.makeAcceptSprintReverseReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeReportSprintReverseReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeRespondSprintReverseReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeSubmitSprintReverseReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeCreateSprintReviewDisputeCommand(execCtx),
      reviewActionFactory.makeCreateSprintReviewDisputeCommentCommand(execCtx),
      reviewActionFactory.makeReportSprintReviewDisputeCommand(execCtx),
      reviewActionFactory.makeGetSprintReviewDisputeDetailQuery(execCtx),
      reviewActionFactory.makeCloseProjectSprintReviewCommand(execCtx),
      reviewActionFactory.makeSubmitSprintReviewPackageCommand(execCtx),
      reviewActionFactory.makeProcessAiDisputeCallbackCommand(),
      reviewActionFactory.makeSaveAiDisputeFeedbackCommand(execCtx),
      reviewActionFactory.makeAcceptTaskReviewCommand(execCtx),
      reviewActionFactory.makeReportTaskReviewDisputeCommand(execCtx),
      reviewActionFactory.makeRespondToTaskReviewCommand(execCtx),
      reviewActionFactory.makeEnsureTaskReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeSubmitTaskReviewCommand(execCtx),
      reviewActionFactory.makeSubmitTaskReviewWorkflowCommand(execCtx),
      reviewActionFactory.makeCreateReviewSessionCommand(execCtx),
      reviewActionFactory.makeCreateReviewDisputeCommentCommand(execCtx),
      reviewActionFactory.makeCreateReviewDisputeEvidenceCommand(execCtx),
      reviewActionFactory.makeRespondToReviewDisputeCommand(execCtx),
      reviewActionFactory.makeBuildReviewDisputeCaseFileCommand(execCtx),
      reviewActionFactory.makeReportReviewDisputeCommand(execCtx),
      reviewActionFactory.makeAddReviewEvidenceCommand(execCtx),
      reviewActionFactory.makeUpsertTaskSelfAssessmentCommand(execCtx),
      reviewActionFactory.makeGetTaskReviewBoardPageQuery(execCtx),
      reviewActionFactory.makeGetTaskReviewBoardQuery(execCtx),
      reviewActionFactory.makeGetReviewEvidencesQuery(execCtx),
      reviewActionFactory.makeGetAdminReviewDisputeDetailQuery(execCtx),
      reviewActionFactory.makeGetTaskSelfAssessmentQuery(execCtx),
      reviewActionFactory.makeGetUserReviewsQuery(execCtx),
      reviewActionFactory.makeStartAiDisputeEvaluationCommand(execCtx),
      reviewActionFactory.makeResolveFlaggedReviewCommand(execCtx),
      reviewActionFactory.makeSubmitSkillReviewCommand(execCtx),
      reviewActionFactory.makeListUserReviewHistoryQuery(execCtx),
      reviewActionFactory.makeListOrgReviewDisputesQuery(execCtx),
      reviewActionFactory.makeListAiDisputeEvaluationsQuery(execCtx),
      reviewActionFactory.makeListReviewDisputeCommentsQuery(execCtx),
      reviewActionFactory.makeListReviewDisputeEvidencesQuery(execCtx),
      reviewActionFactory.makeListPendingSprintReviewPackagesQuery(execCtx),
      reviewActionFactory.makeListSprintReviewPackagesQuery(execCtx),
      reviewActionFactory.makeSubmitReverseReviewCommand(execCtx),
      reviewActionFactory.makeCloseProjectSprintReviewPeriodCommand(execCtx),
      reviewActionFactory.makeResolveReviewDisputeCommand(execCtx),
      reviewActionFactory.makeExpireSprintReviewPackagesCommand(execCtx),
      reviewActionFactory.makeConfirmReviewCommand(execCtx),
      reviewActionFactory.makeListReviewDisputeCaseFilesQuery(execCtx),
      reviewActionFactory.makeCreateReviewDisputeCommand(execCtx),
      reviewActionFactory.makeListAdminReviewDisputesQuery(execCtx),
      reviewActionFactory.makeProcessReviewSubmittedEventCommand(),
      reviewActionFactory.makeProcessReviewConfirmedEventCommand(),
      reviewActionFactory.makeProcessDisputeResolvedEventCommand(),
    ]

    assert.lengthOf(useCases, 56)
    assert.isTrue(useCases.every((useCase) => typeof useCase === 'object'))
  })
})
