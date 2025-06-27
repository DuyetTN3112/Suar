import type { HttpContext } from '@adonisjs/core/http'
import GetAssignableOrganizationRolesQuery from '#actions/organization/access/queries/get_assignable_organization_roles_query'
import { ExecutionContext } from '#types/execution_context'
import ListInvitationsQuery from '#actions/organization/invitations/queries/list_invitations_query'

/**
 * ListInvitationsController
 *
 * Show sent invitations
 *
 * GET /org/invitations
 */
export default class ListInvitationsController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)

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

    // Parse query params
    const page = toPageNumber(request.input('page', 1) as unknown)
    const search = toOptionalString(request.input('search') as unknown)
    const status = toOptionalString(request.input('status') as unknown)

    // Execute query
    const [result, assignableRoles] = await Promise.all([
      new ListInvitationsQuery(execCtx).handle({
        page,
        search,
        status,
      }),
      new GetAssignableOrganizationRolesQuery(execCtx).handle({}),
    ])

    return inertia.render('org/invitations/index', {
      ...result,
      roleOptions: assignableRoles.roleOptions,
    })
  }
}
