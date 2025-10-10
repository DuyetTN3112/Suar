import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildGetMyMarketplaceApplicationsInput } from './mappers/request/marketplace_application_request_mapper.js'
import { mapMyMarketplaceApplicationsPageProps } from './mappers/response/marketplace_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * GET /my-applications - marketplace-owned applicant tracking page.
 *
 * The query/storage stay in tasks for phase 1, but this route is part of the
 * normal applicant marketplace flow and must not require an organization shell.
 */
export default class MyMarketplaceApplicationsController {
  async handle(ctx: HttpContext) {
    const filters = buildGetMyMarketplaceApplicationsInput(ctx.request)
    const query = marketplaceCompositionRoot.makeGetMyMarketplaceApplicationsQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle(filters)

    return ctx.inertia.render(
      'applications/my-applications',
      mapMyMarketplaceApplicationsPageProps(result, filters.status)
    )
  }
}
