import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ORGANIZATION_PAGINATION as PAGINATION } from '#modules/organizations/invitations/actions/dtos/common/organization_pagination'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/invitations/actions/ports/inbound/organization_invitation_query_factory'
import { normalizePagination, toCanonicalPagePagination  } from '#modules/pagination/public_contracts/pagination_public_api'

const ORG_JOIN_REQUESTS_PER_PAGE = 50

/**
 * ListJoinRequestsController
 *
 * Show pending join requests
 *
 * GET /org/invitations/requests
 */
@inject()
export default class ListJoinRequestsController {
  constructor(private readonly actions: OrganizationInvitationQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const pagination = normalizePagination(
      {
        page: request.input('page', PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: ORG_JOIN_REQUESTS_PER_PAGE,
      },
      PAGINATION,
      { perPage: ORG_JOIN_REQUESTS_PER_PAGE }
    )

    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListJoinRequests(execCtx)
    const result = await query.handle(omitUndefined({
      page: pagination.page,
      perPage: pagination.perPage,
      search: toOptionalString(request.input('search', '') as unknown),
    }))

    return inertia.render('org/invitations/requests', {
      requests: result.requests,
      pagination: toCanonicalPagePagination(result.meta),
      filters: result.filters,
    })
  }
}
