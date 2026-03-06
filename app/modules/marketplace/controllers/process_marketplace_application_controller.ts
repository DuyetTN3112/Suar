import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildProcessMarketplaceApplicationDTO } from './mappers/request/marketplace_application_request_mapper.js'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * POST /applications/:applicationId/process - marketplace-owned applicant decision endpoint.
 */
export default class ProcessMarketplaceApplicationController {
  async handle(ctx: HttpContext) {
    const dto = await buildProcessMarketplaceApplicationDTO(
      ctx.request,
      String(ctx.params['applicationId'])
    )
    const command = marketplaceCompositionRoot.makeProcessMarketplaceApplicationCommand(
      actionContextFromHttp(ctx)
    )
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage:
        dto.action === 'approve'
          ? 'Đã duyệt đề xuất tham gia'
          : 'Đã từ chối đề xuất tham gia',
    })
  }
}
