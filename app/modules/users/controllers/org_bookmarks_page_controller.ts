import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'

@inject()
export default class OrgBookmarksPageController {
  constructor(
    private readonly recruitingAccess: RecruitingDirectoryAccessQuery,
    private readonly bookmarkActions: UserRecruiterBookmarkActionFactory
  ) {}

  async handle(ctx: HttpContext) {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      ctx.session.flash('error', 'Bạn cần chọn tổ chức trước khi xem talent đã lưu.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      ctx.session.flash('error', 'Talent đã lưu chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const q = ctx.request.input('q') as unknown
    const folder = ctx.request.input('folder') as unknown
    const pagination = normalizePagination(
      {
        page: ctx.request.input('page'),
        perPage:
          (ctx.request.input('perPage') as unknown) ??
          (ctx.request.input('per_page') as unknown) ??
          (ctx.request.input('limit') as unknown),
      },
      USER_PAGINATION,
      { perPage: 10 }
    )

    const result = await this.bookmarkActions
      .makeWorkspace(actionContextFromHttp(ctx))
      .handle(
        omitUndefined({
          q: typeof q === 'string' ? q : undefined,
          folder: typeof folder === 'string' ? folder : undefined,
          page: pagination.page,
          per_page: pagination.perPage,
        })
      )

    return ctx.inertia.render('org/bookmarks/index', result)
  }
}
