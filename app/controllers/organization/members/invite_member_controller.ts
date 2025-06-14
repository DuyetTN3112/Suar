import type { HttpContext } from '@adonisjs/core/http'

/**
 * InviteMemberController
 *
 * Invite member to org
 *
 * POST /org/members/invite
 */
export default class InviteMemberController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    return response.redirect().back()
  }
}
