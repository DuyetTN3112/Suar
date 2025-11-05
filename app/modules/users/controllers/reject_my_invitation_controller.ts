import type { HttpContext } from '@adonisjs/core/http'

import { respondMutationSuccess } from '#modules/http/boundary/http_mutation_response'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

export default class RejectMyInvitationController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    
    const organizationId = request.param('organizationId') as string
    
    await organizationPublicApi.rejectInvitation(organizationId, execCtx)
    
    respondMutationSuccess(ctx, {
      redirect: { kind: 'back' },
      successMessage: 'Đã từ chối lời mời',
    })
  }
}
