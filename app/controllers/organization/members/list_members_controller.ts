import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListOrganizationMembersQuery from '#actions/organization/members/queries/list_organization_members_query'

/**
 * ListMembersController
 *
 * Show org members
 *
 * GET /org/members
 */
export default class ListMembersController {
  async handle({ inertia, auth, request }: HttpContext) {
    const execCtx = ExecutionContext.fromHttp({ auth, request })
    const user = auth.getUserOrFail()

    if (!user.current_organization_id) {
      return inertia.render('org/no_org')
    }

    const page = Number(request.qs().page) || 1
    const search = request.qs().search
    const orgRole = request.qs().org_role
    const status = request.qs().status

    const query = new ListOrganizationMembersQuery(execCtx)
    const result = await query.execute({
      organizationId: user.current_organization_id,
      page,
      perPage: 50,
      search,
      orgRole,
      status,
    })

    return inertia.render('org/members/index', {
      members: result.data,
      meta: result.meta,
      filters: { search, orgRole, status },
    })
  }
}
