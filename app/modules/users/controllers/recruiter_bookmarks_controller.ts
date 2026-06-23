import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/create_recruiter_bookmark_command'
import DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_command'
import UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/update_recruiter_bookmark_command'

export default class RecruiterBookmarksController {
  private async ensureRecruiterAccess(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập bookmark talent')
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      throw new ForbiddenException('Bạn không có quyền truy cập bookmark talent')
    }
  }

  async index(ctx: HttpContext) {
    const { response } = ctx
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const recruiterUserId = execCtx.userId
    if (!recruiterUserId) {
      response.unauthorized(); return;
    }

    const bookmarks = await db
      .from('recruiter_bookmarks as rb')
      .join('users as u', 'u.id', 'rb.talent_user_id')
      .where('rb.recruiter_user_id', recruiterUserId)
      .select('rb.*', 'u.username as talent_username')
      .orderBy('rb.created_at', 'desc')

    response.json(bookmarks)
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    await this.ensureRecruiterAccess(ctx)
    const talentUserId =
      (ctx.params.userId as string | undefined) ?? (request.input('talent_user_id') as string)
    const notes = request.input('notes') as string | undefined
    const folder = request.input('folder') as string | undefined
    const rating = request.input('rating') as string | number | undefined

    const command = new CreateRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    const result = await command.handle({
      talent_user_id: talentUserId,
      notes: typeof notes === 'string' ? notes : undefined,
      folder: typeof folder === 'string' ? folder : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
    })

    response.json(result)
  }

  async update(ctx: HttpContext) {
    const { request, response, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const notes = request.input('notes') as string | undefined
    const folder = request.input('folder') as string | undefined
    const rating = request.input('rating') as string | number | undefined

    const command = new UpdateRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    const result = await command.handle({
      id: params.id as string,
      notes: typeof notes === 'string' ? notes : undefined,
      folder: typeof folder === 'string' ? folder : undefined,
      rating: rating !== undefined ? Number(rating) : undefined,
    })

    response.json(result)
  }

  async destroy(ctx: HttpContext) {
    const { response, params } = ctx
    await this.ensureRecruiterAccess(ctx)
    const command = new DeleteRecruiterBookmarkCommand(actionContextFromHttp(ctx))
    await command.handle({ id: params.id as string })

    response.noContent()
  }

  async destroyByTalent(ctx: HttpContext) {
    const { response } = ctx
    await this.ensureRecruiterAccess(ctx)
    const execCtx = actionContextFromHttp(ctx)
    const recruiterUserId = execCtx.userId
    const talentUserId = ctx.params.userId as string

    if (!recruiterUserId) {
      response.unauthorized()
      return
    }

    const bookmark = (await db
      .from('recruiter_bookmarks')
      .where('recruiter_user_id', recruiterUserId)
      .where('talent_user_id', talentUserId)
      .select('id')
      .first()) as { id: string } | null

    if (!bookmark) {
      response.notFound({ message: 'Recruiter bookmark not found' })
      return
    }

    const command = new DeleteRecruiterBookmarkCommand(execCtx)
    await command.handle({ id: bookmark.id })

    response.noContent()
  }
}
