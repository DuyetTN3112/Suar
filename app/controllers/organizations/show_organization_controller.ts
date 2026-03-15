import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationDetailQuery from '#actions/organizations/queries/get_organization_detail_query'
import GetOrganizationShowDataQuery from '#actions/organizations/queries/get_organization_show_data_query'
import { GetOrganizationDetailDTO } from '#actions/organizations/dtos/request/get_organization_detail_dto'
import { HttpStatus } from '#constants/error_constants'

/**
 * GET /organizations/:id
 * Show organization detail
 */
export default class ShowOrganizationController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth, response } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user
    const organizationId = params.id as string

    try {
      const dto = new GetOrganizationDetailDTO(organizationId, true, false, false)

      // Execute queries
      const getOrganizationDetail = new GetOrganizationDetailQuery(ExecutionContext.fromHttp(ctx))
      const getShowData = new GetOrganizationShowDataQuery(ctx)

      const [result, showData] = await Promise.all([
        getOrganizationDetail.execute(dto),
        getShowData.execute(organizationId, user.id),
      ])

      return await inertia.render('organizations/show', {
        organization: result,
        members: showData.members,
        userRole: showData.userRole,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định'
      if (errorMessage.includes('không có quyền')) {
        response.status(HttpStatus.FORBIDDEN).redirect('/errors/forbidden')
        return
      }
      response.status(HttpStatus.NOT_FOUND).redirect('/errors/not-found')
      return
    }
  }
}
