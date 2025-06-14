import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListProjectsController
 *
 * Show org projects
 *
 * GET /org/projects
 */
export default class ListProjectsController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/projects/index', {})
  }
}
