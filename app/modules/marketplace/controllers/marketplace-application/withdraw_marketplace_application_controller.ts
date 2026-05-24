import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildWithdrawMarketplaceApplicationDTO } from '../mappers/request/marketplace-application/marketplace_application_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * POST /applications/:applicationId/withdraw - marketplace-owned withdrawal endpoint.
 *
 * Keeps the applicant-facing route in Marketplace while the injected application flow delegates
 * policy and persistence to Tasks.
 */
@inject()
export default class WithdrawMarketplaceApplicationController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const dto = buildWithdrawMarketplaceApplicationDTO(String(ctx.params['applicationId']))
    const command = this.actions.makeWithdrawMarketplaceApplicationCommand(
      actionContextFromHttp(ctx)
    )
    await command.handle(dto).then((outcome) => outcome.getValue())

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã rút đề xuất tham gia',
    })
  }
}
