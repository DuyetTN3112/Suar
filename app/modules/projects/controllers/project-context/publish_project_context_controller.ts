import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectContextPublicationFactory } from '#modules/projects/actions/ports/inbound/project-context/project_context_publication_factory'
import {
  buildWorkPackageArchiveRequest,
  buildProjectContextPublication,
  buildWorkPackagePublication,
} from '#modules/projects/controllers/mappers/request/project-context/project_context_request_mapper'

function requireProjectId(ctx: HttpContext): string {
  const params = ctx.params as Record<string, unknown>
  const projectId = params['projectId']
  if (typeof projectId !== 'string' || projectId.length === 0 || projectId.length > 64) {
    throw ValidationException.field('projectId', 'projectId is invalid.')
  }
  return projectId
}
function requireActor(ctx: HttpContext): void {
  if (!ctx.auth.user) throw new UnauthorizedException()
}


/**
 * Publishes shared Project Context and Work Package versions.
 *
 * Authority, provenance and version fencing are decided by the domain command;
 * this boundary only authenticates, validates shape and forwards the caller's
 * expected active version so a concurrent publication fails with a conflict
 * instead of silently overwriting a newer version.
 */

@inject()
export default class PublishProjectContextController {
  constructor(private readonly publications: ProjectContextPublicationFactory) {}

  async publishContext(ctx: HttpContext) {
    requireActor(ctx)
    const projectId = requireProjectId(ctx)
    const body = buildProjectContextPublication(ctx.request.body())

    const result = await this.publications.makePublishProjectContextVersion(
      actionContextFromHttp(ctx)
    ).executeAndWrap({ projectId, ...body })
    if (result.isFailure()) {
      throw result.getError()
    }
    const published = result.getValue()

    ctx.response.status(201)
    return { contextVersion: published }
  }

  async publishWorkPackage(ctx: HttpContext) {
    requireActor(ctx)
    const projectId = requireProjectId(ctx)
    const body = buildWorkPackagePublication(ctx.request.body())

    const result = await this.publications.makePublishWorkPackageVersion(
      actionContextFromHttp(ctx)
    ).executeAndWrap({ projectId, ...body })
    const published = result.getValue()

    ctx.response.status(201)
    return { workPackageVersion: published }
  }

  async archiveWorkPackage(ctx: HttpContext) {
    requireActor(ctx)
    const projectId = requireProjectId(ctx)
    const params = ctx.params as Record<string, unknown>
    const workPackageId = params['workPackageId']
    if (typeof workPackageId !== 'string' || workPackageId.length === 0) {
      throw ValidationException.field('workPackageId', 'workPackageId is invalid.')
    }

    const { expectedActiveVersionId } = buildWorkPackageArchiveRequest(ctx.request.body())

    const result = await this.publications.makeArchiveWorkPackage(actionContextFromHttp(ctx)).executeAndWrap({
      projectId,
      workPackageId,
      expectedActiveVersionId,
    })
    const archived = result.getValue()

    return { workPackage: archived }
  }
}
