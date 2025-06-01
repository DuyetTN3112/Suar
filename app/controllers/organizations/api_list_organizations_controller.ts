import type { HttpContext } from '@adonisjs/core/http'
import GetAllOrganizationsQuery from '#actions/organizations/queries/get_all_organizations_query'

/**
 * GET /api/organizations
 * API endpoint providing organizations list
 */
export default class ApiListOrganizationsController {
  async handle(ctx: HttpContext) {
    const { response } = ctx
    try {
      const getAllOrganizations = new GetAllOrganizationsQuery(ctx)
      const organizations = await getAllOrganizations.getBasicList()
      response.json(organizations)
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi lấy danh sách tổ chức'
      response.status(500).json({
        error: 'Có lỗi xảy ra khi lấy danh sách tổ chức',
        details: errorMessage,
      })
      return
    }
  }
}
