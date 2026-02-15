import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'
import { throttle } from '#start/limiter'
const ReviewsController = () => import('#controllers/reviews/reviews_controller')

router
  .group(() => {
    // Review session routes
    router.get('/reviews/pending', [ReviewsController, 'pending']).as('reviews.pending')
    router.get('/reviews/:id', [ReviewsController, 'show']).as('reviews.show')
    router.post('/reviews/:id/submit', [ReviewsController, 'submit']).as('reviews.submit')
    router.post('/reviews/:id/confirm', [ReviewsController, 'confirm']).as('reviews.confirm')

    // My reviews (as reviewee)
    router.get('/my-reviews', [ReviewsController, 'myReviews']).as('reviews.mine')

    // User reviews (public profile)
    router.get('/users/:id/reviews', [ReviewsController, 'userReviews']).as('users.reviews')

    // API routes
    router
      .post('/api/reviews/sessions', [ReviewsController, 'createSession'])
      .as('api.reviews.sessions.create')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
