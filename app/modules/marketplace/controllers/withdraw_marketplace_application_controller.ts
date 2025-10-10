import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildWithdrawMarketplaceApplicationDTO } from './mappers/request/marketplace_application_request_mapper.js'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'

/**
 * POST /applications/:applicationId/withdraw - marketplace-owned withdrawal endpoint.
 *
 * Phase 1 keeps the existing task command/storage but removes the task workspace org
 * requirement from a normal applicant action.
 */
export default class WithdrawMarketplaceApplicationController {
  async handle(ctx: HttpContext) {
    const dto = buildWithdrawMarketplaceApplicationDTO(String(ctx.params['applicationId']))
    const command = marketplaceCompositionRoot.makeWithdrawMarketplaceApplicationCommand(
      actionContextFromHttp(ctx)
    )
    await command.handle(dto)

    respondMutationSuccess(ctx, {
      redirect: {
        kind: 'back',
      },
      successMessage: 'Đã rút đề xuất tham gia',
    })
  }
}
