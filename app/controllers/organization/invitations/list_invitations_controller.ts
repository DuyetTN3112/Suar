import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListInvitationsController
 *
 * Show sent invitations
 *
 * GET /org/invitations
 */
export default class ListInvitationsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/invitations/index', {})
  }
}
