import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'
import {
  mapRecruiterBookmarkApiBody,
  mapRecruiterBookmarksApiBody,
} from '#modules/users/controllers/mappers/response/user_response_mapper'

@inject()
export default class RecruiterBookmarksController {
  constructor(
    private readonly recruitingAccess: RecruitingDirectoryAccessQuery,
    private readonly bookmarkActions: UserRecruiterBookmarkActionFactory
  ) {}

  private async ensureRecruiterAccess(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh sách talent đã lưu')
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh sách talent đã lưu')
    }
  }

  async index(ctx: HttpContext) {
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const bookmarks = await this.bookmarkActions.makeList(execCtx).handle()

    return mapRecruiterBookmarksApiBody(bookmarks)
  }

  async store(ctx: HttpContext) {
    const { request } = ctx
    await this.ensureRecruiterAccess(ctx)
    const talentUserId =
      (ctx.params['userId'] as string | undefined) ??
      ((request.input('talentUserId') ?? request.input('talent_user_id')) as string)
    const notes = request.input('notes') as string | undefined
    const folder = request.input('folder') as string | undefined
    const rating = request.input('rating') as string | number | undefined

    const command = this.bookmarkActions.makeCreate(actionContextFromHttp(ctx))
    const result = await command.handle(
      omitUndefined({
        talent_user_id: talentUserId,
        notes: typeof notes === 'string' ? notes : undefined,
        folder: typeof folder === 'string' ? folder : undefined,
        rating: rating !== undefined ? Number(rating) : undefined,
      })
    )

    return mapRecruiterBookmarkApiBody(result)
  }

  async update(ctx: HttpContext) {
    const { request, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const notes = request.input('notes') as string | undefined
    const folder = request.input('folder') as string | undefined
    const rating = request.input('rating') as string | number | undefined

    const command = this.bookmarkActions.makeUpdate(actionContextFromHttp(ctx))
    const result = await command.handle(
      omitUndefined({
        id: params['bookmarkId'] as string,
        notes: typeof notes === 'string' ? notes : undefined,
        folder: typeof folder === 'string' ? folder : undefined,
        rating: rating !== undefined ? Number(rating) : undefined,
      })
    )

    return mapRecruiterBookmarkApiBody(result)
  }

  async destroy(ctx: HttpContext) {
    const { response, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const command = this.bookmarkActions.makeDelete(actionContextFromHttp(ctx))
    await command.handle({ id: params['bookmarkId'] as string })

    response.noContent()
  }

  async destroyByTalent(ctx: HttpContext) {
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const talentUserId = ctx.params['userId'] as string

    await this.bookmarkActions.makeDeleteByTalent(execCtx).handle({ talentUserId })

    ctx.response.noContent()
  }
}
