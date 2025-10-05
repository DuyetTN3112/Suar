import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewApiBody } from './mappers/response/user_response_mapper.js'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

export default class TalentDetailController {
  private async ensureRecruitingAccess(ctx: HttpContext): Promise<string> {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    return organizationId
  }

  private async ensureTalentBelongsToOrganization(userId: string, organizationId: string) {
    const talent = await userPublicApi.findById(userId)
    if (!talent || talent.current_organization_id !== organizationId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }
  }

  async handle(ctx: HttpContext) {
    const organizationId = await this.ensureRecruitingAccess(ctx)
    const userId = ctx.params['userId'] as string
    await this.ensureTalentBelongsToOrganization(userId, organizationId)

    const result = await new GetProfileViewPageQuery(actionContextFromHttp(ctx)).execute({
      userId,
      currentUserId: ctx.auth.user?.id ?? null,
    })

    ctx.response.status(200).json(mapProfileViewApiBody(result))
  }
}
