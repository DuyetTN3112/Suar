import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { makeSearchTalentsQuery } from '#modules/users/bootstrap/user_query_factory'
import { mapTalentSearchApiBody } from '#modules/users/controllers/mappers/response/user_response_mapper'

export default class TalentsSearchController {
  private async ensureRecruitingAccess(ctx: HttpContext): Promise<void> {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }
  }

  async handle(ctx: HttpContext) {
    await this.ensureRecruitingAccess(ctx)

    const { request } = ctx
    const q = request.input('q') as unknown
    const taskId = (request.input('taskId') as unknown) ?? (request.input('task_id') as unknown)

    const query = makeSearchTalentsQuery(actionContextFromHttp(ctx))
    const result = await query.handle(omitUndefined({
      q: typeof q === 'string' ? q : undefined,
      task_id: typeof taskId === 'string' ? taskId : undefined,
    }))

    return mapTalentSearchApiBody(result)
  }
}
