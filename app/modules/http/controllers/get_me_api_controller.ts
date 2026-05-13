import type { HttpContext } from '@adonisjs/core/http'

/**
 * GET /api/me → Get current authenticated user
 */
export default class GetMeApiController {
  async handle({ auth }: HttpContext) {
    await auth.check()
    return auth.user
  }
}
