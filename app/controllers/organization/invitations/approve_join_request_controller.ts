import type { HttpContext } from '@adonisjs/core/http'

/**
 * ApproveJoinRequestController
 *
 * Approve join request
 *
 * PUT /org/invitations/requests/:id/approve
 */
export default class ApproveJoinRequestController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    return response.redirect().back()
  }
}
