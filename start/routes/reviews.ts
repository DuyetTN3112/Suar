import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ListPendingReviewsController = () =>
  import('#modules/reviews/controllers/list_pending_reviews_controller')
const ShowReviewController = () => import('#modules/reviews/controllers/show_review_controller')
const SubmitReviewController = () => import('#modules/reviews/controllers/submit_review_controller')
const ConfirmReviewController = () =>
  import('#modules/reviews/controllers/confirm_review_controller')
const MyReviewsController = () => import('#modules/reviews/controllers/my_reviews_controller')
const UserReviewsController = () => import('#modules/reviews/controllers/user_reviews_controller')
const CreateReviewSessionController = () =>
  import('#modules/reviews/controllers/create_review_session_controller')
const CreateReviewDisputeController = () =>
  import('#modules/reviews/controllers/create_review_dispute_controller')
const ListAdminReviewDisputesController = () =>
  import('#modules/reviews/controllers/list_admin_review_disputes_controller')
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
const ShowUserDisputeController = () =>
  import('#modules/reviews/controllers/show_user_dispute_controller')
const StartAiDisputeEvaluationController = () =>
  import('#modules/reviews/controllers/start_ai_dispute_evaluation_controller')

const SubmitReverseReviewController = () =>
  import('#modules/reviews/controllers/submit_reverse_review_controller')
const CreateReverseReviewController = () =>
  import('#modules/reviews/controllers/create_reverse_review_controller')
const ListReverseReviewsController = () =>
  import('#modules/reviews/controllers/list_reverse_reviews_controller')
const ShowReverseReviewsPageController = () =>
  import('#modules/reviews/controllers/show_reverse_reviews_page_controller')
const RespondToReviewDisputeController = () =>
  import('#modules/reviews/controllers/respond_to_review_dispute_controller')
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

// ---------------------------------------------------------------------------
// Org-scoped review routes (require auth + organization context)
// ---------------------------------------------------------------------------
router
  .group(() => {
    // Review session routes
    router.get('/reviews/pending', [ListPendingReviewsController, 'handle']).as('reviews.pending')
    router
      .get('/reviews/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('reviews.reverse_reviews')
    router
      .get('/org/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('org.reverse_reviews')

    router.get('/reviews/:id', [ShowReviewController, 'handle']).as('reviews.show')
    router.post('/reviews/:id/submit', [SubmitReviewController, 'handle']).as('reviews.submit')
    router.post('/reviews/:id/confirm', [ConfirmReviewController, 'handle']).as('reviews.confirm')
    router.get('/reviews/disputes/:id', [ShowUserDisputeController, 'handle']).as('reviews.disputes.show')

    router
      .get('/reviews/:id/evidences', [GetReviewEvidencesController, 'handle'])
      .as('reviews.evidences.list')
    router
      .post('/reviews/:id/evidences', [AddReviewEvidenceController, 'handle'])
      .as('reviews.evidences.add')
    router
      .get('/reviews/:id/self-assessment', [GetTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.get')
    router
      .post('/reviews/:id/self-assessment', [UpsertTaskSelfAssessmentController, 'handle'])
      .as('reviews.self_assessment.upsert')

    // Reverse review (reviewee rates reviewers)
    router
      .post('/reviews/:id/reverse', [SubmitReverseReviewController, 'handle'])
      .as('reviews.reverse')
    router
      .post('/api/review-sessions/:sessionId/reverse-reviews', [
        CreateReverseReviewController,
        'handle',
      ])
      .as('api.review_sessions.reverse_reviews.create')
    router
      .get('/api/me/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.me.reverse_reviews.list')
    router
      .get('/api/org/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.org.reverse_reviews.list')

    router
      .post('/api/reviews/disputes', [CreateReviewDisputeController, 'handle'])
      .as('api.reviews.disputes.create')
    router
      .get('/api/reviews/disputes/:id/comments', [ListReviewDisputeCommentsController, 'handle'])
      .as('api.reviews.disputes.comments.list')
    router
      .post('/api/reviews/disputes/:id/comments', [CreateReviewDisputeCommentController, 'handle'])
      .as('api.reviews.disputes.comments.create')
    router
      .get('/api/reviews/disputes/:id/evidences', [ListReviewDisputeEvidencesController, 'handle'])
      .as('api.reviews.disputes.evidences.list')
    router
      .post('/api/reviews/disputes/:id/evidences', [CreateReviewDisputeEvidenceController, 'handle'])
      .as('api.reviews.disputes.evidences.create')
    router
      .post('/api/org/reviews/disputes/:id/respond', [RespondToReviewDisputeController, 'handle'])
      .as('api.org.reviews.disputes.respond')

    // My reviews (as reviewee)
    router.get('/my-reviews', [MyReviewsController, 'handle']).as('reviews.mine')

    // User reviews (public profile)
    router.get('/users/:id/reviews', [UserReviewsController, 'handle']).as('users.reviews')

    // API routes
    router
      .post('/api/reviews/sessions', [CreateReviewSessionController, 'handle'])
      .as('api.reviews.sessions.create')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// ---------------------------------------------------------------------------
// Admin-only review routes (auth + throttle, NO org requirement)
// Authorization is enforced inside controller/query/guard layer.
// ---------------------------------------------------------------------------
router
  .group(() => {
    // Admin reverse-reviews page
    router
      .get('/admin/reverse-reviews', [ShowReverseReviewsPageController, 'handle'])
      .as('admin.reverse_reviews')

    // Admin API reverse reviews list
    router
      .get('/api/admin/reverse-reviews', [ListReverseReviewsController, 'handle'])
      .as('api.admin.reverse_reviews.list')

    // Admin dispute management
    router
      .get('/api/admin/reviews/disputes', [ListAdminReviewDisputesController, 'handle'])
      .as('api.admin.reviews.disputes.list')
    router
      .get('/api/admin/reviews/disputes/:id', [ShowAdminReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.show')
    router
      .post('/api/admin/reviews/disputes/:id/resolve', [ResolveReviewDisputeController, 'handle'])
      .as('api.admin.reviews.disputes.resolve')
    router
      .get('/api/admin/reviews/disputes/:id/case-files', [ListReviewDisputeCaseFilesController, 'handle'])
      .as('api.admin.reviews.disputes.case_files.list')
    router
      .post('/api/admin/reviews/disputes/:id/case-files', [
        BuildReviewDisputeCaseFileController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.case_files.create')
    router
      .get('/api/admin/reviews/disputes/:id/ai-evaluations', [
        ListAiDisputeEvaluationsController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.list')
    router
      .post('/api/admin/reviews/disputes/:id/ai-evaluations', [
        StartAiDisputeEvaluationController,
        'handle',
      ])
      .as('api.admin.reviews.disputes.ai_evaluations.create')

    // Admin: Flagged reviews
    router
      .get('/admin/flagged-reviews', [ListFlaggedReviewsController, 'handle'])
      .as('admin.flagged_reviews')
    router
      .post('/admin/flagged-reviews/:id/resolve', [ResolveFlaggedReviewController, 'handle'])
      .as('admin.flagged_reviews.resolve')
  })
  .use([middleware.auth(), middleware.requireSystemAdmin(), middleware.systemAdminContext(), throttle])

const AiDisputeCallbackController = () =>
  import('#modules/reviews/controllers/ai_dispute_callback_controller')

router
  .post('/api/public/ai-disputes/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai_disputes.callback')
  .use([throttle])

router
  .post('/api/public/ai/dispute-evaluations/callback', [AiDisputeCallbackController, 'handle'])
  .as('api.public.ai.dispute_evaluations.callback.legacy')
  .use([throttle])
