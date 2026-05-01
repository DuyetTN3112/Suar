import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AccomplishmentPublicationFactory } from '#modules/accomplishments/actions/ports/inbound/publication/accomplishment_publication_factory'
import { buildAccomplishmentPublicationRequest } from '#modules/accomplishments/controllers/mappers/request/publication/accomplishment_publication_request_mapper'
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
export default class PublishAccomplishmentPublicationController {
  constructor(private readonly publications: AccomplishmentPublicationFactory) {}

  async handle(ctx: HttpContext) {
    const actor = actionContextFromHttp(ctx)
    const body = buildAccomplishmentPublicationRequest(ctx.request.body())
    const result = await this.publications.publish({
      accomplishmentId: accomplishmentId(ctx),
      actorUserId: actor.userId,
      ...body,
      now: new Date().toISOString(),
      auditContext: actor,
    })

    ctx.response.status(201)
    return {
      inserted: result.inserted,
      projection: result.projection,
    }
  }
}
