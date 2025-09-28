import type { HttpContext } from '@adonisjs/core/http'

import ListOrganizationsQuery from '#modules/admin/actions/organizations/queries/list_organizations_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import {
  mapAdminOrganizationResponse,
  wrapAdminCollectionResponse,
} from '#modules/admin/controllers/mappers/response/admin_api_response_mapper'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'

const ADMIN_ORGANIZATIONS_PER_PAGE = 24
export default class ListOrganizationsController {
  private buildListInput(ctx: HttpContext) {
    const { request } = ctx

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ADMIN_ORGANIZATIONS_PER_PAGE,
      },
      PAGINATION,
      { perPage: ADMIN_ORGANIZATIONS_PER_PAGE }
    )
    const search = toOptionalString(request.input('search', '') as unknown)

    return {
      page: pagination.page,
      ...(search ? { search } : {}),
    }
  }

  private async list(ctx: HttpContext) {
    const { page, search } = this.buildListInput(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const query = new ListOrganizationsQuery(execCtx)

    const result = await query.handle({
      page,
      perPage: ADMIN_ORGANIZATIONS_PER_PAGE,
      ...(search ? { search } : {}),
    })

    return { result, filters: { search } }
  }

  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const { result, filters } = await this.list(ctx)

    return inertia.render('organizations/index', {
      organizations: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: { search: filters.search ?? '' },
    })
  }

  async apiIndex(ctx: HttpContext) {
    const { result, filters } = await this.list(ctx)

    ctx.response.status(HttpStatus.OK).json(
      wrapAdminCollectionResponse(
        result.data.map(mapAdminOrganizationResponse),
        result.meta,
        { filters: { search: filters.search ?? '' } }
      )
    )
  }
}
