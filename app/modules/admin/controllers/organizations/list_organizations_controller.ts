import type { HttpContext } from '@adonisjs/core/http'

import ListOrganizationsQuery from '#modules/admin/actions/organizations/queries/list_organizations_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'

const ADMIN_ORGANIZATIONS_PER_PAGE = 24

/**
 * ListOrganizationsController
 *
 * Show list of all organizations (System Admin only)
 *
 * GET /admin/organizations
 */
export default class ListOrganizationsController {
  private buildListInput(ctx: HttpContext) {
    const { request } = ctx

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

    const page = toPageNumber(request.input('page', PAGINATION.DEFAULT_PAGE) as unknown)
    const search = toOptionalString(request.input('search', '') as unknown)

    return { page, search }
  }

  private async list(ctx: HttpContext) {
    const { page, search } = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListOrganizationsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_ORGANIZATIONS_PER_PAGE,
      search,
    })

    return { result, filters: { search } }
  }

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const { result, filters } = await this.list(ctx)

    return inertia.render('admin/organizations/index', {
      organizations: result.data,
      pagination: result.meta,
      filters: { search: filters.search ?? '' },
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json({
      success: true,
      data: result.data,
      meta: result.meta,
      filters: { search: filters.search ?? '' },
    });
  }
}
