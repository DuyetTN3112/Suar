import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ListPendingReviewsController = () =>
  import('#controllers/reviews/list_pending_reviews_controller')
const ShowReviewController = () => import('#controllers/reviews/show_review_controller')
const SubmitReviewController = () => import('#controllers/reviews/submit_review_controller')
const ConfirmReviewController = () => import('#controllers/reviews/confirm_review_controller')
const MyReviewsController = () => import('#controllers/reviews/my_reviews_controller')
const UserReviewsController = () => import('#controllers/reviews/user_reviews_controller')
const CreateReviewSessionController = () =>
  import('#controllers/reviews/create_review_session_controller')
const SubmitReverseReviewController = () =>
  import('#controllers/reviews/submit_reverse_review_controller')
const ListFlaggedReviewsController = () =>
  import('#controllers/reviews/list_flagged_reviews_controller')
const ResolveFlaggedReviewController = () =>
  import('#controllers/reviews/resolve_flagged_review_controller')
const AddReviewEvidenceController = () =>
  import('#controllers/reviews/add_review_evidence_controller')
const UpsertTaskSelfAssessmentController = () =>
  import('#controllers/reviews/upsert_task_self_assessment_controller')
const GetReviewEvidencesController = () =>
  import('#controllers/reviews/get_review_evidences_controller')
const GetTaskSelfAssessmentController = () =>
  import('#controllers/reviews/get_task_self_assessment_controller')

router
  .group(() => {
    // Review session routes
    router.get('/reviews/pending', [ListPendingReviewsController, 'handle']).as('reviews.pending')
    router.get('/reviews/:id', [ShowReviewController, 'handle']).as('reviews.show')
    router.post('/reviews/:id/submit', [SubmitReviewController, 'handle']).as('reviews.submit')
    router.post('/reviews/:id/confirm', [ConfirmReviewController, 'handle']).as('reviews.confirm')
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

    // My reviews (as reviewee)
    router.get('/my-reviews', [MyReviewsController, 'handle']).as('reviews.mine')

    // User reviews (public profile)
    router.get('/users/:id/reviews', [UserReviewsController, 'handle']).as('users.reviews')

    // Admin: Flagged reviews
    router
      .get('/admin/flagged-reviews', [ListFlaggedReviewsController, 'handle'])
      .as('admin.flagged_reviews')
    router
      .post('/admin/flagged-reviews/:id/resolve', [ResolveFlaggedReviewController, 'handle'])
      .as('admin.flagged_reviews.resolve')

    // API routes
    router
      .post('/api/reviews/sessions', [CreateReviewSessionController, 'handle'])
      .as('api.reviews.sessions.create')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
