import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildGetOrganizationMarketplaceApplicationsInput } from './mappers/request/marketplace_application_request_mapper.js'
import { mapOrganizationMarketplaceApplicationsPageProps } from './mappers/response/marketplace_application_response_mapper.js'

import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'
import {
  canAccessOrganizationAdminShell,
  type OrgRole,
} from '#modules/organizations/access/public_contracts/organization_access'

@inject()
export default class ListOrganizationMarketplaceApplicationsController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)
    const access = canAccessOrganizationAdminShell((ctx.currentOrganizationRole ?? null) as OrgRole | null)
    if (!access.allowed) {
      ctx.response.status(403)
      return ctx.inertia.render('errors/forbidden', {})
    }

    const filters = buildGetOrganizationMarketplaceApplicationsInput(ctx.request, organizationId)
    const query = this.actions.makeGetMarketplaceOrganizationApplicationsQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle(filters)

    return ctx.inertia.render(
      'applications/index',
      mapOrganizationMarketplaceApplicationsPageProps(result, filters.status)
    )
  }
}
