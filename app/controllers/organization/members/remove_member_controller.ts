import type { HttpContext } from '@adonisjs/core/http'

/**
 * RemoveMemberController
 *
 * Remove member from org
 *
 * DELETE /org/members/:id
 */
export default class RemoveMemberController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    return response.redirect().back()
  }
}
