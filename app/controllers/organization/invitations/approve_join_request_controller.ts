import type { HttpContext } from '@adonisjs/core/http'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:id/approve
 */
export default class ApproveJoinRequestController {
  handle({ response, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    response.redirect().back()
  }
}
