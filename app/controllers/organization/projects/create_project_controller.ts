import type { HttpContext } from '@adonisjs/core/http'

/**
 * CreateProjectController
 *
 * Create new project
 *
 * POST /org/projects
 */
export default class CreateProjectController {
  handle({ response, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    session.flash('success', 'Action completed')
    response.redirect().back()
  }
}
