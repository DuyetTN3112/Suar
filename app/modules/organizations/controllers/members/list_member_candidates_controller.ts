import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { OrganizationMemberCandidateQueryFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_candidate_query_factory'
import { buildOrganizationMemberCandidateQuery } from '#modules/organizations/controllers/mappers/request/members/list_member_candidates_request_mapper'

/**
 * Return user-realm identities that can be added to the current organization.
 *
 * The response deliberately excludes system-role and system-administration
 * fields. Access is enforced by the /org owner/admin middleware stack.
 */
@inject()
export default class ListMemberCandidatesController {
  constructor(private readonly actions: OrganizationMemberCandidateQueryFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const result = await this.actions
      .make(actionContextFromHttp(ctx))
      .executeAndWrap(buildOrganizationMemberCandidateQuery(ctx.request, organizationId))
      .then((outcome) => outcome.getValue())

    return ctx.response.ok({
      data: result.data,
      pagination: {
        page: result.pagination.page,
        perPage: result.pagination.perPage,
        total: result.pagination.total,
        hasNextPage: result.pagination.page < result.pagination.lastPage,
      },
    })
  }
}
