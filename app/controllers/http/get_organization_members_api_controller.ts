import type { HttpContext } from '@adonisjs/core/http'
import GetOrganizationMembersApiQuery from '#actions/organizations/queries/get_organization_members_api_query'
import loggerService from '#services/logger_service'
import { HttpStatus } from '#constants/error_constants'

/**
 * GET /api/organization-members/:id → Get organization members
 */
export default class GetOrganizationMembersApiController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    try {
      const query = new GetOrganizationMembersApiQuery(ctx)
      const result = await query.execute(params.id as string)

      response.json({
        success: true,
        organization: result.organization,
        members: result.members,
      })
      return
    } catch (error) {
      const err = error as Error
      loggerService.error('Lỗi khi lấy danh sách thành viên tổ chức', err)
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Lỗi khi lấy danh sách thành viên tổ chức',
        error: err.message,
      })
      return
    }
  }
}
