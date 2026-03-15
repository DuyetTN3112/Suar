import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationsListQuery from '#actions/organizations/queries/get_organizations_list_query'
import GetAllOrganizationsQuery from '#actions/organizations/queries/get_all_organizations_query'
import { GetOrganizationsListDTO } from '#actions/organizations/dtos/request/get_organizations_list_dto'

/**
 * GET /organizations
 * Display organizations list for current user
 */
export default class ListOrganizationsController {
  async handle(ctx: HttpContext) {
    const { auth, inertia, request } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }
    const user = auth.user

    // Build DTO from request
    const dto = new GetOrganizationsListDTO(
      Number(request.input('page', 1)),
      Number(request.input('limit', 20)),
      request.input('search') as string | undefined,
      request.input('plan') as string | undefined
    )

    // Execute queries
    const getOrganizationsList = new GetOrganizationsListQuery(ExecutionContext.fromHttp(ctx))
    const getAllOrganizations = new GetAllOrganizationsQuery(ctx)

    const [result, enhancedAllOrganizations] = await Promise.all([
      getOrganizationsList.execute(dto),
      getAllOrganizations.getEnhanced(),
    ])

    return inertia.render('organizations/index', {
      organizations: result.data,
      pagination: result.pagination,
      currentOrganizationId: user.current_organization_id,
      allOrganizations: enhancedAllOrganizations,
    })
  }
}
