import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ADMIN_PAGINATION as PAGINATION } from '#modules/admin/packages/actions/dtos/common/packages/admin_pagination'
import { AdminPackageActionFactory } from '#modules/admin/packages/actions/ports/inbound/packages/admin_package_action_factory'
import { SUBSCRIPTION_PACKAGE_CATALOG } from '#modules/admin/packages/constants/packages/subscription_packages'
import { buildAdminPackagesRequest } from '#modules/admin/packages/controllers/mappers/request/packages/admin_packages_read_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

@inject()
export default class ListPackagesController {
  constructor(private readonly actions: AdminPackageActionFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)

    const pageRequest = buildAdminPackagesRequest(request)
    const { page, search, plan, status } = pageRequest
    const filters = {
      ...(search ? { search } : {}),
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
    }

    const query = this.actions.makeListSubscriptionsQuery(execCtx)
    const result = await query
      .executeAndWrap({
        page,
        perPage: PAGINATION.DEFAULT_PER_PAGE,
        ...filters,
      })
      .then((outcome) => outcome.getValue())

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
