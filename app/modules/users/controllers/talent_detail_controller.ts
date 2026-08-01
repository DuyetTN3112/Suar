import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewApiBody } from './mappers/response/user_response_mapper.js'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'

@inject()
export default class TalentDetailController {
  constructor(
    private readonly recruitingAccess: RecruitingDirectoryAccessQuery,
    private readonly profilePages: UserProfilePageQueryFactory
  ) {}

  private async ensureRecruitingAccess(ctx: HttpContext): Promise<string> {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    return organizationId
  }

  private async ensureTalentBelongsToOrganization(
    userId: string,
    organizationId: string,
    actorUserId: string
  ) {
    const canViewTalent = await this.recruitingAccess.canViewTalent(
      organizationId,
      actorUserId,
      userId
    )
    if (!canViewTalent) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }
  }

  async handle(ctx: HttpContext) {
    const organizationId = await this.ensureRecruitingAccess(ctx)
    const userId = ctx.params['userId'] as string
    await this.ensureTalentBelongsToOrganization(userId, organizationId, ctx.auth.user?.id ?? '')

    const result = await this.profilePages.makeView(actionContextFromHttp(ctx)).execute({
      userId,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    ctx.response.status(200).json(mapProfileViewApiBody(result))
  }
}
