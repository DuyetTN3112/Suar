import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AccomplishmentPublicationFactory } from '#modules/accomplishments/actions/ports/inbound/publication/accomplishment_publication_factory'
import { buildAccomplishmentUnpublicationRequest } from '#modules/accomplishments/controllers/mappers/request/publication/accomplishment_unpublication_request_mapper'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'

function accomplishmentId(ctx: HttpContext): string {
  const value = (ctx.params as Record<string, unknown>)['accomplishmentId']
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) {
    throw ValidationException.field('accomplishmentId', 'accomplishmentId is invalid.')
  }
  return value
}

@inject()
export default class UnpublishAccomplishmentPublicationController {
  constructor(private readonly publications: AccomplishmentPublicationFactory) {}

  async handle(ctx: HttpContext) {
    const actor = actionContextFromHttp(ctx)
    const body = buildAccomplishmentUnpublicationRequest(ctx.request.body())
    const result = await this.publications.unpublish({
      accomplishmentId: accomplishmentId(ctx),
      actorUserId: actor.userId,
      ...body,
      retiredAt: new Date().toISOString(),
      auditContext: actor,
    })
    return result
  }
}
