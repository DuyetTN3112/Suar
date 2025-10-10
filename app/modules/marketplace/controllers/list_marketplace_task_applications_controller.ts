import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildGetMarketplaceTaskApplicationsDTO } from './mappers/request/marketplace_application_request_mapper.js'
import { mapMarketplaceTaskApplicationsPageProps } from './mappers/response/marketplace_application_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * GET /tasks/:taskId/applications - marketplace-owned applicant review page.
 */
export default class ListMarketplaceTaskApplicationsController {
  async handle(ctx: HttpContext) {
    const dto = buildGetMarketplaceTaskApplicationsDTO(ctx.request, String(ctx.params['taskId']))
    const query = marketplaceCompositionRoot.makeGetMarketplaceTaskApplicationsQuery(
      actionContextFromHttp(ctx)
    )
    const result = await query.handle(dto)

    return ctx.inertia.render(
      'tasks/applications',
      mapMarketplaceTaskApplicationsPageProps(
        result,
        String(ctx.params['taskId']),
        dto.status,
        'organization'
      )
    )
  }
}
