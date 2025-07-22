import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetAssignableOrganizationRolesQuery from '#actions/organization/access/queries/get_assignable_organization_roles_query'
import ListOrganizationMembersQuery from '#actions/organization/members/queries/list_organization_members_query'

const ORG_MEMBERS_PER_PAGE = 50

interface MemberListQueryParams {
  page?: number | string
  search?: string
  org_role?: string
  status?: string
}

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

    const qs = request.qs() as MemberListQueryParams
    const page = toPageNumber(qs.page)
    const search = toOptionalString(qs.search)
    const orgRole = toOptionalString(qs.org_role)
    const status = toOptionalString(qs.status)

    const [result, assignableRoles] = await Promise.all([
      new ListOrganizationMembersQuery(execCtx).handle({
        organizationId: user.current_organization_id,
        page,
        perPage: ORG_MEMBERS_PER_PAGE,
        search,
        orgRole,
        status,
      }),
      new GetAssignableOrganizationRolesQuery(execCtx).handle({
        organizationId: user.current_organization_id,
      }),
    ])

    return inertia.render('org/members/index', {
      members: result.data,
      meta: result.meta,
      filters: {
        search: search ?? '',
        orgRole: orgRole ?? null,
        status: status ?? null,
      },
      roleOptions: assignableRoles.roleOptions,
    })
  }
}
