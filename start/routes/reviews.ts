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

router
  .group(() => {
    // Review session routes
    router.get('/reviews/pending', [ListPendingReviewsController, 'handle']).as('reviews.pending')
    router.get('/reviews/:id', [ShowReviewController, 'handle']).as('reviews.show')
    router.post('/reviews/:id/submit', [SubmitReviewController, 'handle']).as('reviews.submit')
    router.post('/reviews/:id/confirm', [ConfirmReviewController, 'handle']).as('reviews.confirm')

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
