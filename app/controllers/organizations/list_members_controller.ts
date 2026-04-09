import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import GetOrganizationMembersPageQuery from '#actions/organizations/queries/get_organization_members_page_query'
import logger from '@adonisjs/core/services/logger'

/**
 * GET /organizations/:id/members
 * Display organization members management page
 */
export default class ListMembersController {
  async handle(ctx: HttpContext) {
    const { params, inertia, auth, request } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const organizationId = params.id as string

    const toPageNumber = (value: unknown, fallback: number): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback
      }
      return fallback
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
    }

    const toIncludeList = (value: unknown): Array<'activity' | 'audit'> | undefined => {
      const values = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value
              .split(',')
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : []

      const allowed = new Set(['activity', 'audit'])
      const normalized = values.filter(
        (item): item is 'activity' | 'audit' => typeof item === 'string' && allowed.has(item)
      )
      return normalized.length > 0 ? normalized : undefined
    }

    const qs = request.qs() as Record<string, unknown>
    const page = toPageNumber(qs.page, 1)
    const limit = toPageNumber(qs.limit, 100)
    const roleId = toOptionalString(qs.roleId ?? qs.org_role)
    const search = toOptionalString(qs.search)

    const statusRaw = toOptionalString(qs.statusFilter ?? qs.status)
    const statusFilter =
      statusRaw === 'active' || statusRaw === 'pending' || statusRaw === 'inactive'
        ? statusRaw
        : undefined

    const include = toIncludeList(qs.include)

    try {
      const pageData = await new GetOrganizationMembersPageQuery(
        ExecutionContext.fromHttp(ctx)
      ).execute(organizationId, user.id, {
        page,
        limit,
        roleId,
        search,
        statusFilter,
        include,
      })

      const filters = {
        search: search ?? '',
        status: statusFilter,
        roleId,
        include: include ?? [],
      }

      return await inertia.render('organizations/members/index', {
        ...pageData,
        filters,
      })
    } catch (error: unknown) {
      logger.error({ error }, '[ListMembersController.handle] Error')
      return inertia.render('organizations/members/index', {
        organization: null,
        members: [],
        roles: [],
        userRole: 0,
        pendingRequests: [],
        filters: {
          search: '',
          include: [],
        },
      })
    }
  }
}
