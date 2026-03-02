import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'
import { mapTalentSearchApiBody } from '#modules/users/controllers/mappers/response/user_response_mapper'

@inject()
export default class TalentsSearchController {
  constructor(
    private readonly recruitingAccess: RecruitingDirectoryAccessQuery,
    private readonly talentQueries: UserTalentQueryFactory
  ) {}

  private async ensureRecruitingAccess(ctx: HttpContext): Promise<void> {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh bạ talent')
    }
  }

  async handle(ctx: HttpContext) {
    await this.ensureRecruitingAccess(ctx)

    const { request } = ctx
    const q = request.input('q') as unknown
    const taskId = (request.input('taskId') as unknown) ?? (request.input('task_id') as unknown)

    const query = this.talentQueries.makeSearch(actionContextFromHttp(ctx))
    const result = await query.handle(
      omitUndefined({
        q: typeof q === 'string' ? q : undefined,
        task_id: typeof taskId === 'string' ? taskId : undefined,
      })
    )

    return mapTalentSearchApiBody(result)
  }
}
