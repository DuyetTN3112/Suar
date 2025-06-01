import type { HttpContext } from '@adonisjs/core/http'
import GetDebugOrganizationInfoQuery from '#actions/organizations/queries/get_debug_organization_info_query'

/**
 * GET /api/debug-organization-info → Debug organization info (DEV ONLY)
 */
export default class DebugOrganizationInfoApiController {
  async handle({ auth, session, response }: HttpContext) {
    try {
      const user = auth.user
      if (!user) {
        response.status(401).json({ success: false, message: 'Chưa đăng nhập' })
        return
      }

      const sessionOrgId = session.get('current_organization_id') as string | undefined
      const debug = await GetDebugOrganizationInfoQuery.execute(user.id, sessionOrgId)

      response.json({ success: true, debug })
      return
    } catch (error) {
      const err = error as Error
      response.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin debug',
        error: err.message,
      })
      return
    }
  }
}
