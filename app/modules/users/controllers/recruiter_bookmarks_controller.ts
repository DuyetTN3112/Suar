import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import {
  actionContextFromHttp,
  requireCurrentOrganizationId,
} from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/create_recruiter_bookmark_command'
import DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_command'
import UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/update_recruiter_bookmark_command'
import {
  mapRecruiterBookmarkApiBody,
  mapRecruiterBookmarksApiBody,
} from '#modules/users/controllers/mappers/response/user_response_mapper'

export default class RecruiterBookmarksController {
  private async ensureRecruiterAccess(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh sách talent đã lưu')
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      throw new ForbiddenException('Bạn không có quyền truy cập danh sách talent đã lưu')
    }
  }

  async index(ctx: HttpContext) {
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const recruiterUserId = execCtx.userId
    if (!recruiterUserId) {
      throw new UnauthorizedException('Bạn cần đăng nhập để xem talent đã lưu')
    }

    const bookmarks = await db
      .from('recruiter_bookmarks as rb')
      .join('users as u', 'u.id', 'rb.talent_user_id')
      .where('rb.recruiter_user_id', recruiterUserId)
      .select('rb.*', 'u.username as talent_username')
      .orderBy('rb.created_at', 'desc')

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

    const command = new CreateRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    const result = await command.handle(omitUndefined({
      talent_user_id: talentUserId,
      notes: typeof notes === 'string' ? notes : undefined,
      folder: typeof folder === 'string' ? folder : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
    }))

    return mapRecruiterBookmarkApiBody(result)
  }

  async update(ctx: HttpContext) {
    const { request, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const notes = request.input('notes') as string | undefined
    const folder = request.input('folder') as string | undefined
    const rating = request.input('rating') as string | number | undefined

    const command = new UpdateRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    const result = await command.handle(omitUndefined({
      id: params['bookmarkId'] as string,
      notes: typeof notes === 'string' ? notes : undefined,
      folder: typeof folder === 'string' ? folder : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
    }))

    return mapRecruiterBookmarkApiBody(result)
  }

  async destroy(ctx: HttpContext) {
    const { response, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const command = new DeleteRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    await command.handle({ id: params['bookmarkId'] as string })

    response.noContent()
  }

  async destroyByTalent(ctx: HttpContext) {
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const recruiterUserId = execCtx.userId
    const talentUserId = ctx.params['userId'] as string

    if (!recruiterUserId) {
      throw new UnauthorizedException('Bạn cần đăng nhập để gỡ lưu talent')
    }

    const bookmark = (await db
      .from('recruiter_bookmarks')
      .where('recruiter_user_id', recruiterUserId)
      .where('talent_user_id', talentUserId)
      .select('id')
      .first()) as { id: string } | null

    if (!bookmark) {
      throw new NotFoundException('Talent bookmark not found')
    }

    const command = new DeleteRecruiterBookmarkCommand(execCtx)
    await command.handle({ id: bookmark.id })

    ctx.response.noContent()
  }
}
