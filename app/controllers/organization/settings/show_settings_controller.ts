import type { HttpContext } from '@adonisjs/core/http'

/**
 * ShowSettingsController
 *
 * Show org settings
 *
 * GET /org/settings
 */
export default class ShowSettingsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/settings/general', {})
  }
}
