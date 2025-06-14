import type { HttpContext } from '@adonisjs/core/http'

/**
 * ListTaskStatusesController
 *
 * Show custom task statuses
 *
 * GET /org/workflow/statuses
 */
export default class ListTaskStatusesController {
  async handle({ inertia, response, params, session }: HttpContext) {
    // TODO Phase 1.4: Implement action/query logic
    return inertia.render('org/workflow/statuses', {})
  }
}
