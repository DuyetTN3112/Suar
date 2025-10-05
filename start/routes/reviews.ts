import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const RedirectPendingReviewsController = () =>
  import('#modules/reviews/controllers/redirect_pending_reviews_controller')
const ShowReviewController = () => import('#modules/reviews/controllers/show_review_controller')
const SubmitReviewController = () => import('#modules/reviews/controllers/submit_review_controller')
const ConfirmReviewController = () =>
  import('#modules/reviews/controllers/confirm_review_controller')
const UserReviewsController = () => import('#modules/reviews/controllers/user_reviews_controller')
const CreateReviewSessionController = () =>
  import('#modules/reviews/controllers/create_review_session_controller')
const CreateReviewDisputeController = () =>
  import('#modules/reviews/controllers/create_review_dispute_controller')
const ListAdminReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_admin_review_disputes_controller')
const ListOrgReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_org_review_disputes_controller')
const CreateReviewDisputeCommentController = () =>
  import('#modules/reviews/controllers/create_review_dispute_comment_controller')
const CreateReviewDisputeEvidenceController = () =>
  import('#modules/reviews/controllers/create_review_dispute_evidence_controller')
const BuildReviewDisputeCaseFileController = () =>
  import('#modules/reviews/controllers/build_review_dispute_case_file_controller')
const ListReviewDisputeCaseFilesController = () =>
  import('#modules/reviews/controllers/list_review_dispute_case_files_controller')
const ListReviewDisputeCommentsController = () =>
  import('#modules/reviews/controllers/list_review_dispute_comments_controller')
const ListAiDisputeEvaluationsController = () =>
  import('#modules/reviews/controllers/list_ai_dispute_evaluations_controller')
const ListReviewDisputeEvidencesController = () =>
  import('#modules/reviews/controllers/list_review_dispute_evidences_controller')
const ResolveReviewDisputeController = () =>
  import('#modules/reviews/controllers/resolve_review_dispute_controller')
const ShowAdminReviewDisputeController = () =>
  import('#modules/reviews/controllers/show_admin_review_dispute_controller')
const ShowOrgDisputesPageController = () =>
  import('#modules/reviews/controllers/show_org_disputes_page_controller')
const ShowUserDisputeController = () =>
  import('#modules/reviews/controllers/show_user_dispute_controller')
const StartAiDisputeEvaluationController = () =>
  import('#modules/reviews/controllers/start_ai_dispute_evaluation_controller')
const CloseProjectSprintReviewController = () =>
  import('#modules/reviews/controllers/close_project_sprint_review_controller')
const CloseProjectSprintReviewPeriodController = () =>
  import('#modules/reviews/controllers/close_project_sprint_review_period_controller')
const ExpireSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/expire_sprint_review_packages_controller')
const SubmitSprintReviewPackageController = () =>
  import('#modules/reviews/controllers/submit_sprint_review_package_controller')
const CreateSprintReviewDisputeController = () =>
  import('#modules/reviews/controllers/create_sprint_review_dispute_controller')
const CreateSprintReviewDisputeCommentController = () =>
  import('#modules/reviews/controllers/create_sprint_review_dispute_comment_controller')
const ReportSprintReviewDisputeController = () =>
  import('#modules/reviews/controllers/report_sprint_review_dispute_controller')

const SubmitReverseReviewController = () =>
  import('#modules/reviews/controllers/submit_reverse_review_controller')
const CreateReverseReviewController = () =>
  import('#modules/reviews/controllers/create_reverse_review_controller')
const ListReverseReviewsController = () =>
  import('#modules/reviews/controllers/list_reverse_reviews_controller')
const ListPendingSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/list_pending_sprint_review_packages_controller')
const ListSprintReviewPackagesController = () =>
  import('#modules/reviews/controllers/list_sprint_review_packages_controller')
const ShowSprintReviewPackageController = () =>
  import('#modules/reviews/controllers/show_sprint_review_package_controller')
const ShowSprintReviewDisputeController = () =>
  import('#modules/reviews/controllers/show_sprint_review_dispute_controller')
const ShowReverseReviewsPageController = () =>
  import('#modules/reviews/controllers/show_reverse_reviews_page_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/respond_to_review_dispute_controller')
const ReportReviewDisputeController = () =>
  import('#modules/reviews/controllers/report_review_dispute_controller')
const ListFlaggedReviewsController = () =>
  import('#modules/reviews/controllers/list_flagged_reviews_controller')
const ResolveFlaggedReviewController = () =>
  import('#modules/reviews/controllers/resolve_flagged_review_controller')
const AddReviewEvidenceController = () =>
  import('#modules/reviews/controllers/add_review_evidence_controller')
const UpsertTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/upsert_task_self_assessment_controller')
const GetReviewEvidencesController = () =>
  import('#modules/reviews/controllers/get_review_evidences_controller')
const GetTaskSelfAssessmentController = () =>
  import('#modules/reviews/controllers/get_task_self_assessment_controller')
const ShowTaskReviewBoardController = () =>
  import('#modules/reviews/controllers/show_task_review_board_controller')
const SubmitTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/submit_task_review_workflow_controller')
const AcceptTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/accept_task_review_workflow_controller')
const RespondTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/respond_task_review_workflow_controller')
const ReportTaskReviewWorkflowController = () =>
  import('#modules/reviews/controllers/report_task_review_workflow_controller')
const ShowSprintReverseReviewBoardController = () =>
  import('#modules/reviews/controllers/show_sprint_reverse_review_board_controller')
const SubmitSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/submit_sprint_reverse_review_workflow_controller')
const AcceptSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/accept_sprint_reverse_review_workflow_controller')
const RespondSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/respond_sprint_reverse_review_workflow_controller')
const ReportSprintReverseReviewWorkflowController = () =>
  import('#modules/reviews/controllers/report_sprint_reverse_review_workflow_controller')

router
  .group(() => {
    router
      .get('/api/me/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.me.reverse_reviews.index')
      .use([
        middleware.bindHttpTransport('api-compat'),
        middleware.bindApiAuthContract('session-or-bearer'),
        middleware.bindReverseReviewScope('me'),
      ])
    router
      .get('/api/v1/me/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.v1.me.reverse_reviews.index')
      .use([
        middleware.bindHttpTransport('api-canonical'),
        middleware.bindApiAuthContract('bearer-or-session'),
        middleware.bindReverseReviewScope('me'),
      ])
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
    // Review session routes
    router
      .get('/reviews/pending', [RedirectPendingReviewsController, 'handle'])
      .as('reviews.pending_reviews.index')
    router
      .get('/reviews/task-board', [ShowTaskReviewBoardController, 'handle'])
      .as('reviews.task_board.index')
    router
      .get('/org/reviews/task-board', [ShowTaskReviewBoardController, 'handle'])
      .as('org.reviews.task_board.index')
    router
      .get('/reviews/sprint-reverse-board', [ShowSprintReverseReviewBoardController, 'handle'])
      .as('reviews.sprint_reverse_board.index')
    router
      .get('/reviews/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('reviews.reverse_reviews.index')
    router
      .get('/org/reviews/sprint-reverse-board', [ShowSprintReverseReviewBoardController, 'handle'])
      .as('org.reviews.sprint_reverse_board.index')
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
      .post('/task-reviews/:workflowId/report', [ReportTaskReviewWorkflowController, 'handle'])
      .as('task_reviews.report')
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
      .get('/org/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('org.reverse_reviews.index')
    router.get('/org/disputes', [ShowOrgDisputesPageController, 'handle']).as('org.disputes.index')

    router
      .get('/reviews/:reviewId', [ShowReviewController, 'handle'])
      .where('reviewId', router.matchers.uuid())
      .as('reviews.show')
    router
      .post('/reviews/:reviewId/submit', [SubmitReviewController, 'handle'])
      .as('reviews.submissions.store')
    router
      .post('/reviews/:reviewId/confirm', [ConfirmReviewController, 'handle'])
      .as('reviews.confirmations.store')
    router
      .get('/reviews/disputes/:disputeId', [ShowUserDisputeController, 'handle'])
      .as('reviews.disputes.show')
    router
      .get('/reviews/sprint-disputes/:disputeId', [ShowSprintReviewDisputeController, 'handle'])
      .as('reviews.sprint_disputes.show')

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
      .get('/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.v1.me.organizations.current.reverse_reviews.index')
      .use(middleware.bindReverseReviewScope('org'))
    router
      .get('/reviews/disputes', [ListOrgReviewDisputesController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.index')
    router
      .post('/reviews/disputes/:disputeId/respond', [RespondToReviewDisputeController, 'handle'])
      .as('api.v1.me.organizations.current.reviews.disputes.responses.store')
  })
  .prefix('/api/v1/me/organizations/current')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

// ---------------------------------------------------------------------------
// Admin-only review routes (auth + throttle, NO org requirement)
// Authorization is enforced inside controller/query/guard layer.
// ---------------------------------------------------------------------------
router
  .group(() => {
    // Admin reverse-reviews page
    router
      .get('/admin/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('admin.reverse_reviews.index')

    // Admin: Flagged reviews
    router
      .get('/admin/flagged-reviews', [ListFlaggedReviewsController, 'handle'])
      .as('admin.flagged_reviews.index')
    router
      .post('/admin/flagged-reviews/:flaggedReviewId/resolve', [
        ResolveFlaggedReviewController,
        'handle',
      ])
      .as('admin.flagged_reviews.resolutions.store')
  })
  .use([
    middleware.auth(),
    middleware.requireSystemAdmin(),
    middleware.systemAdminContext(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.admin.reverse_reviews.index')
      .use(middleware.bindReverseReviewScope('admin'))
    router
      .get('/reviews/disputes', [ListAdminReviewDisputesController, 'handle'])
      .as('api.admin.reviews.disputes.index')
    router
      .get('/reviews/disputes/:disputeId', [ShowAdminReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.show')
    router
      .post('/reviews/disputes/:disputeId/resolve', [ResolveReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.resolution.store')
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
  import('#modules/reviews/controllers/ai_dispute_callback_controller')

router
  .post('/api/public/ai-disputes/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_disputes.callbacks.store')
  .use([middleware.bindHttpTransport('api-public-callback'), throttle])

router
  .post('/api/public/ai/dispute-evaluations/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_dispute_evaluations.callbacks.store')
  .use([middleware.bindHttpTransport('api-public-callback'), throttle])
