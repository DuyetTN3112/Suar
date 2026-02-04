import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildProcessMarketplaceApplicationDTO } from './mappers/request/marketplace_application_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * POST /applications/:applicationId/process - marketplace-owned applicant decision endpoint.
 */
@inject()
export default class ProcessMarketplaceApplicationController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = await buildProcessMarketplaceApplicationDTO(
      ctx.request,
      String(ctx.params['applicationId'])
    )
    const command = this.actions.makeProcessMarketplaceApplicationCommand(
      actionContextFromHttp(ctx)
    )
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage:
        dto.action === 'approve' ? 'Đã duyệt đề xuất tham gia' : 'Đã từ chối đề xuất tham gia',
    })
  }
}
