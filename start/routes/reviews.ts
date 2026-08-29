import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const SubmitReviewController = () => import('#modules/reviews/controllers/review-core/submit_review_controller')
const ConfirmReviewController = () =>
  import('#modules/reviews/controllers/review-core/confirm_review_controller')
const UserReviewsController = () => import('#modules/reviews/controllers/review-core/user_reviews_controller')
const CreateReviewSessionController = () =>
  import('#modules/reviews/controllers/review-session/create_review_session_controller')
const CreateReviewDisputeController = () =>
  import('#modules/reviews/controllers/disputes/create_review_dispute_controller')
const ListAdminReviewDisputesController = () =>
  import('#modules/reviews/controllers/disputes/list_admin_review_disputes_controller')
const ListOrgReviewDisputesController = () =>
  import('#modules/reviews/controllers/disputes/list_org_review_disputes_controller')
const CreateReviewDisputeCommentController = () =>
  import('#modules/reviews/controllers/disputes/create_review_dispute_comment_controller')
const CreateReviewDisputeEvidenceController = () =>
  import('#modules/reviews/controllers/disputes/create_review_dispute_evidence_controller')
const BuildReviewDisputeCaseFileController = () =>
  import('#modules/reviews/controllers/disputes/build_review_dispute_case_file_controller')
const ListReviewDisputeCaseFilesController = () =>
  import('#modules/reviews/controllers/disputes/list_review_dispute_case_files_controller')
const ListReviewDisputeCommentsController = () =>
  import('#modules/reviews/controllers/disputes/list_review_dispute_comments_controller')
const ListAiDisputeEvaluationsController = () =>
  import('#modules/reviews/controllers/disputes/list_ai_dispute_evaluations_controller')
const ListReviewDisputeEvidencesController = () =>
  import('#modules/reviews/controllers/disputes/list_review_dispute_evidences_controller')
const ResolveReviewDisputeController = () =>
  import('#modules/reviews/controllers/disputes/resolve_review_dispute_controller')
const ShowAdminReviewDisputeController = () =>
  import('#modules/reviews/controllers/disputes/show_admin_review_dispute_controller')
const StartAiDisputeEvaluationController = () =>
  import('#modules/reviews/controllers/disputes/start_ai_dispute_evaluation_controller')
const ApproveAiProfileCapabilityProposalController = () =>
  import('#modules/reviews/controllers/disputes/approve_ai_profile_capability_proposal_controller')
const CloseProjectSprintReviewController = () =>
  import('#modules/reviews/controllers/sprint-review/close_project_sprint_review_controller')
const CloseProjectSprintReviewPeriodController = () =>
  import('#modules/reviews/controllers/sprint-review/close_project_sprint_review_period_controller')
const ExpireSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/sprint-review/expire_sprint_review_packages_controller')
const SubmitSprintReviewPackageController = () =>
  import('#modules/reviews/controllers/sprint-review/submit_sprint_review_package_controller')
const CreateSprintReviewDisputeController = () =>
  import('#modules/reviews/controllers/sprint-review/create_sprint_review_dispute_controller')
const CreateSprintReviewDisputeCommentController = () =>
  import('#modules/reviews/controllers/sprint-review/create_sprint_review_dispute_comment_controller')
const ReportSprintReviewDisputeController = () =>
  import('#modules/reviews/controllers/sprint-review/report_sprint_review_dispute_controller')

const SubmitReverseReviewController = () =>
  import('#modules/reviews/controllers/review-submission/submit_reverse_review_controller')
const CreateReverseReviewController = () =>
  import('#modules/reviews/controllers/review-submission/create_reverse_review_controller')
const ListPendingSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/sprint-review/list_pending_sprint_review_packages_controller')
const ListSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/sprint-review/list_sprint_review_packages_controller')
const ShowSprintReviewPackageController = () =>
  import('#modules/reviews/controllers/sprint-review/show_sprint_review_package_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/disputes/respond_to_review_dispute_controller')
const ReportReviewDisputeController = () =>
  import('#modules/reviews/controllers/disputes/report_review_dispute_controller')
const AddReviewEvidenceController = () =>
  import('#modules/reviews/controllers/review-core/add_review_evidence_controller')
const UpsertTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/self-assessment/upsert_task_self_assessment_controller')
const GetReviewEvidencesController = () =>
  import('#modules/reviews/controllers/review-core/get_review_evidences_controller')
const GetTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/self-assessment/get_task_self_assessment_controller')
const SubmitTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/submit_task_review_workflow_controller')
const AcceptTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/accept_task_review_workflow_controller')
const FinalizeTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/finalize_task_review_workflow_controller')
const RespondTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/respond_task_review_workflow_controller')
const OpenTaskReviewDisputeWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/open_task_review_dispute_workflow_controller')
const ReportTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/task-review/report_task_review_workflow_controller')
const CreateReviewObservationController = () =>
  import('#modules/reviews/controllers/observation/create_review_observation_controller')
const SubmitSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/sprint-review/submit_sprint_reverse_review_workflow_controller')
const AcceptSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/sprint-review/accept_sprint_reverse_review_workflow_controller')
const RespondSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/sprint-review/respond_sprint_reverse_review_workflow_controller')
const ReportSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/sprint-review/report_sprint_reverse_review_workflow_controller')

router
  .group(() => {
    router
      .get('/api/v1/me/sprint-review-packages', [ListSprintReviewPackagesController, 'handle'])
      .as('api.v1.me.sprint_review_packages.index')
      .use([
        middleware.bindHttpTransport('api-canonical'),
        middleware.bindApiAuthContract('bearer-or-session'),
      ])
    router
      .get('/api/v1/me/sprint-review-packages/pending', [
        ListPendingSprintReviewPackagesController,
        'handle',
      ])
      .as('api.v1.me.sprint_review_packages.pending')
      .use([
        middleware.bindHttpTransport('api-canonical'),
        middleware.bindApiAuthContract('bearer-or-session'),
      ])
  })
  .use([middleware.auth(), throttle])

// ---------------------------------------------------------------------------
// Org-scoped review routes (require auth + organization context)
// ---------------------------------------------------------------------------
router
  .group(() => {
    // Project review pages live exclusively under /projects/:projectId/reviews/*.
    router
      .post('/task-reviews/tasks/:taskId/reviews', [SubmitTaskReviewWorkflowController, 'handle'])
      .as('task_reviews.reviews.store')
    router
      .post('/task-reviews/:workflowId/accept', [AcceptTaskReviewWorkflowController, 'handle'])
      .as('task_reviews.accept')
    router
      .post('/task-reviews/:workflowId/respond', [RespondTaskReviewWorkflowController, 'handle'])
      .as('task_reviews.responses.store')
    router
      .post('/task-reviews/:workflowId/open-dispute', [OpenTaskReviewDisputeWorkflowController, 'handle'])
      .as('task_reviews.dispute.open')
    router
      .post('/task-reviews/:workflowId/report', [ReportTaskReviewWorkflowController, 'handle'])
      .as('task_reviews.report')
    router
      .post('/reviews/:workflowId/observations', [CreateReviewObservationController, 'handle'])
      .as('reviews.observations.store')
    router
      .post('/sprint-reverse-reviews/:workflowId/submit', [
        SubmitSprintReverseReviewWorkflowController,
        'handle',
      ])
      .as('sprint_reverse_reviews.submit')
    router
      .post('/sprint-reverse-reviews/:workflowId/accept', [
        AcceptSprintReverseReviewWorkflowController,
        'handle',
      ])
      .as('sprint_reverse_reviews.accept')
    router
      .post('/sprint-reverse-reviews/:workflowId/respond', [
        RespondSprintReverseReviewWorkflowController,
        'handle',
      ])
      .as('sprint_reverse_reviews.respond')
    router
      .post('/sprint-reverse-reviews/:workflowId/report', [
        ReportSprintReverseReviewWorkflowController,
        'handle',
      ])
      .as('sprint_reverse_reviews.report')
    router
      .post('/reviews/:reviewId/submit', [SubmitReviewController, 'handle'])
      .where('reviewId', router.matchers.uuid())
      .as('reviews.submissions.store')
    router
      .post('/reviews/:reviewId/confirm', [ConfirmReviewController, 'handle'])
      .as('reviews.confirmations.store')
    router
      .get('/reviews/:reviewId/evidences', [GetReviewEvidencesController, 'handle'])
      .as('reviews.evidences.index')
    router
      .post('/reviews/:reviewId/evidences', [AddReviewEvidenceController, 'handle'])
      .as('reviews.evidences.store')
    router
      .get('/reviews/:reviewId/self-assessment', [GetTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.show')
    router
      .post('/reviews/:reviewId/self-assessment', [UpsertTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.store')

    // Reverse review (reviewee rates reviewers)
    router
      .post('/reviews/:reviewId/reverse', [SubmitReverseReviewController, 'handle'])
      .as('reviews.reverse_reviews.submissions.store')

    // User reviews (public profile)
    router
      .get('/users/:userId/reviews', [UserReviewsController, 'handle'])
      .as('users.reviews.index')

    router
      .group(() => {
        router
          .post('/reviews/sessions', [CreateReviewSessionController, 'handle'])
          .as('reviews.sessions.store')
        router
          .post('/review-sessions/:sessionId/reverse-reviews', [
            CreateReverseReviewController,
            'handle',
          ])
          .as('review_sessions.reverse_reviews.store')
        router
          .post('/reviews/disputes', [CreateReviewDisputeController, 'handle'])
          .as('reviews.disputes.store')
        router
          .get('/reviews/disputes/:disputeId/comments', [
            ListReviewDisputeCommentsController,
            'handle',
          ])
          .as('reviews.disputes.comments.index')
        router
          .post('/reviews/disputes/:disputeId/comments', [
            CreateReviewDisputeCommentController,
            'handle',
          ])
          .as('reviews.disputes.comments.store')
        router
          .get('/reviews/disputes/:disputeId/evidences', [
            ListReviewDisputeEvidencesController,
            'handle',
          ])
          .as('reviews.disputes.evidences.index')
        router
          .post('/reviews/disputes/:disputeId/evidences', [
            CreateReviewDisputeEvidenceController,
            'handle',
          ])
          .as('reviews.disputes.evidences.store')
        router
          .post('/reviews/disputes/:disputeId/report', [ReportReviewDisputeController, 'handle'])
          .as('reviews.disputes.report')
        router
          .post('/project-sprints/:sprintId/close-review', [
            CloseProjectSprintReviewController,
            'handle',
          ])
          .as('project_sprints.close_review')
        router
          .post('/project-sprints/:sprintId/close-review-period', [
            CloseProjectSprintReviewPeriodController,
            'handle',
          ])
          .as('project_sprints.close_review_period')
        router
          .post('/project-sprints/:sprintId/expire-pending-review-packages', [
            ExpireSprintReviewPackagesController,
            'handle',
          ])
          .as('project_sprints.expire_pending_review_packages')
        router
          .get('/sprint-review-packages/:packageId', [ShowSprintReviewPackageController, 'handle'])
          .as('sprint_review_packages.show')
        router
          .post('/sprint-review-packages/:packageId/submit', [
            SubmitSprintReviewPackageController,
            'handle',
          ])
          .as('sprint_review_packages.submit')
        router
          .post('/sprint-review-packages/:packageId/disputes', [
            CreateSprintReviewDisputeController,
            'handle',
          ])
          .as('sprint_review_packages.disputes.store')
        router
          .post('/sprint-review-disputes/:disputeId/comments', [
            CreateSprintReviewDisputeCommentController,
            'handle',
          ])
          .as('sprint_review_disputes.comments.store')
        router
          .post('/sprint-review-disputes/:disputeId/report', [
            ReportSprintReviewDisputeController,
            'handle',
          ])
          .as('sprint_review_disputes.report')
      })
      .prefix('/api/v1')
      .as('api.v1')
      .use([
        middleware.bindHttpTransport('api-canonical'),
        middleware.bindApiAuthContract('bearer-or-session'),
      ])
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

router
  .group(() => {
    router
      .post('/review-sessions/:sessionId/reverse-reviews', [
        CreateReverseReviewController,
        'handle',
      ])
      .as('api.review_sessions.reverse_reviews.store')
    router
      .post('/reviews/disputes', [CreateReviewDisputeController, 'handle'])
      .as('api.reviews.disputes.store')
    router
      .get('/reviews/disputes/:disputeId/comments', [ListReviewDisputeCommentsController, 'handle'])
      .as('api.reviews.disputes.comments.index')
    router
      .post('/reviews/disputes/:disputeId/comments', [
        CreateReviewDisputeCommentController,
        'handle',
      ])
      .as('api.reviews.disputes.comments.store')
    router
      .get('/reviews/disputes/:disputeId/evidences', [
        ListReviewDisputeEvidencesController,
        'handle',
      ])
      .as('api.reviews.disputes.evidences.index')
    router
      .post('/reviews/disputes/:disputeId/evidences', [
        CreateReviewDisputeEvidenceController,
        'handle',
      ])
      .as('api.reviews.disputes.evidences.store')
    router
      .post('/reviews/disputes/:disputeId/report', [ReportReviewDisputeController, 'handle'])
      .as('api.reviews.disputes.report')
    router
      .post('/reviews/sessions', [CreateReviewSessionController, 'handle'])
      .as('api.reviews.sessions.store')
    router
      .post('/project-sprints/:sprintId/close-review', [
        CloseProjectSprintReviewController,
        'handle',
      ])
      .as('api.project_sprints.close_review')
    router
      .post('/project-sprints/:sprintId/close-review-period', [
        CloseProjectSprintReviewPeriodController,
        'handle',
      ])
      .as('api.project_sprints.close_review_period')
    router
      .post('/project-sprints/:sprintId/expire-pending-review-packages', [
        ExpireSprintReviewPackagesController,
        'handle',
      ])
      .as('api.project_sprints.expire_pending_review_packages')
    router
      .get('/sprint-review-packages/:packageId', [ShowSprintReviewPackageController, 'handle'])
      .as('api.sprint_review_packages.show')
    router
      .post('/sprint-review-packages/:packageId/submit', [
        SubmitSprintReviewPackageController,
        'handle',
      ])
      .as('api.sprint_review_packages.submit')
    router
      .post('/sprint-review-packages/:packageId/disputes', [
        CreateSprintReviewDisputeController,
        'handle',
      ])
      .as('api.sprint_review_packages.disputes.store')
    router
      .post('/sprint-review-disputes/:disputeId/comments', [
        CreateSprintReviewDisputeCommentController,
        'handle',
      ])
      .as('api.sprint_review_disputes.comments.store')
    router
      .post('/sprint-review-disputes/:disputeId/report', [
        ReportSprintReviewDisputeController,
        'handle',
      ])
      .as('api.sprint_review_disputes.report')
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/reviews/disputes', [ListOrgReviewDisputesController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.index')
    router
      .post('/reviews/disputes/:disputeId/respond', [RespondToReviewDisputeController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.responses.store')
    router
      .post('/reviews/tasks/:workflowId/finalize', [
        FinalizeTaskReviewWorkflowController,
        'handle',
      ])
      .as('api.v1.me.organizations.current.reviews.tasks.finalize')
  })
  .prefix('/api/v1/me/organizations/current')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/reviews/disputes', [ListAdminReviewDisputesController, 'handle'])
      .as('api.admin.reviews.disputes.index')
    router
      .get('/reviews/disputes/:disputeId', [ShowAdminReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.show')
    router
      .post('/reviews/disputes/:disputeId/comments', [
        CreateReviewDisputeCommentController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.comments.store')
    router
      .post('/reviews/disputes/:disputeId/resolve', [ResolveReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.resolution.store')
    router
      .post('/task-reviews/:workflowId/finalize', [
        FinalizeTaskReviewWorkflowController,
        'handle',
      ])
      .as('api.admin.task_reviews.finalize')
    router
      .get('/reviews/disputes/:disputeId/case-files', [
        ListReviewDisputeCaseFilesController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.case_files.index')
    router
      .post('/reviews/disputes/:disputeId/case-files', [
        BuildReviewDisputeCaseFileController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.case_files.store')
    router
      .get('/reviews/disputes/:disputeId/ai-evaluations', [
        ListAiDisputeEvaluationsController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.index')
    router
      .post('/reviews/disputes/:disputeId/ai-evaluations', [
        StartAiDisputeEvaluationController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.store')
    router
      .post(
        '/reviews/disputes/:disputeId/ai-evaluations/:evaluationId/profile-proposals/:proposalIndex/approve',
        [ApproveAiProfileCapabilityProposalController, 'handle']
      )
      .as('api.admin.reviews.disputes.ai_profile_proposals.approve')
  })
  .prefix('/api/admin')
  .use([
    middleware.bindHttpTransport('api-admin-internal'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireSystemAdmin(),
    middleware.systemAdminContext(),
    throttle,
  ])

const AiDisputeCallbackController = () =>
  import('#modules/reviews/controllers/disputes/ai_dispute_callback_controller')

router
  .post('/api/public/ai-disputes/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_disputes.callbacks.store')
  .use([middleware.bindHttpTransport('api-public-callback'), throttle])

router
  .post('/api/public/ai/dispute-evaluations/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_dispute_evaluations.callbacks.store')
  .use([middleware.bindHttpTransport('api-public-callback'), throttle])
