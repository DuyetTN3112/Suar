import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { OrganizationInvitationQueryFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_query_factory'
import { buildJoinRequestsPageRequest } from '#modules/organizations/controllers/mappers/request/invitations/join_requests_page_request_mapper'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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

    const pageRequest = buildJoinRequestsPageRequest(request)

    const execCtx = actionContextFromHttp(ctx)
    const query = this.actions.makeListJoinRequests(execCtx)
    const result = await query
      .executeAndWrap(omitUndefined({
        page: pageRequest.page,
        perPage: pageRequest.perPage,
        search: pageRequest.search,
      }))
      .then((outcome) => outcome.getValue())

    return inertia.render('org/invitations/requests', {
      requests: result.requests,
      pagination: toCanonicalPagePagination(result.meta),
      filters: result.filters,
    })
  }
}
