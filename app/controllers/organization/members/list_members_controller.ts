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
  async handle(ctx: HttpContext) {
    const { inertia, auth, request } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)
    const user = auth.user

    if (!user) {
      return inertia.render('auth/login', {})
    }

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    if (!user.current_organization_id) {
      return inertia.render('org/no_org', {})
    }

    const qs = request.qs() as Record<string, unknown>
    const page = toPageNumber(qs.page)
    const search = toOptionalString(qs.search)
    const orgRole = toOptionalString(qs.org_role)
    const status = toOptionalString(qs.status)

    const query = new ListOrganizationMembersQuery(execCtx)
    const result = await query.handle({
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
      filters: {
        search: search ?? '',
        orgRole: orgRole ?? null,
        status: status ?? null,
      },
    })
  }
}
