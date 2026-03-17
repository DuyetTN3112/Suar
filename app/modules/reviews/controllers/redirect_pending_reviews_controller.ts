import type { HttpContext } from '@adonisjs/core/http'

export default class RedirectPendingReviewsController {
  handle({ request, response }: HttpContext) {
    response.redirect().withQs(request.qs()).toPath('/reviews/task-board')
  }
}
