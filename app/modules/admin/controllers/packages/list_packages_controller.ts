import type { HttpContext } from '@adonisjs/core/http'


import ListSubscriptionsQuery from '#modules/admin/actions/packages/queries/list_subscriptions_query'
import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/application/dtos/common/admin_pagination'
import { SUBSCRIPTION_PACKAGE_CATALOG } from '#modules/admin/constants/subscription_packages'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'

export default class ListPackagesController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: PAGINATION.DEFAULT_PER_PAGE,
      },
      PAGINATION
    )
    const search = toOptionalString(request.input('search', '') as unknown)
    const plan = toOptionalString(request.input('plan', '') as unknown)
    const status = toOptionalString(request.input('status', '') as unknown)
    const filters = {
      ...(search ? { search } : {}),
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
    }

    const query = new ListSubscriptionsQuery(execCtx)
    const result = await query.handle({
      page: pagination.page,
      perPage: pagination.perPage,
      ...filters,
    })

    return inertia.render('admin/packages/index', {
      stats: result.stats,
      subscriptions: result.subscriptions,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: filters.search ?? '',
        plan: filters.plan ?? '',
        status: filters.status ?? '',
      },
      packages: SUBSCRIPTION_PACKAGE_CATALOG,
    })
  }
}
