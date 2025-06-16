import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListJoinRequestsController
 *
 * Show pending join requests
 *
 * GET /org/invitations/requests
 */
export default class ListJoinRequestsController {
  async handle({ inertia }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/invitations/requests', {})
  }
}
