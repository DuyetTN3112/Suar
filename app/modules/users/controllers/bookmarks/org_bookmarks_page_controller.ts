import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import { buildOrgBookmarksPageRequest } from '#modules/users/controllers/mappers/request/bookmarks/org_bookmarks_page_request_mapper'

@inject()
export default class OrgBookmarksPageController {
  constructor(private readonly bookmarkActions: UserRecruiterBookmarkActionFactory) {}

  async handle(ctx: HttpContext) {
    const input = buildOrgBookmarksPageRequest(ctx.request)
    const result = await this.bookmarkActions
      .makeWorkspace(actionContextFromHttp(ctx))
      .executeAndWrap(input)

    if (result.isFailure()) {
      ctx.session.flash('error', 'Talent đã lưu chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    return ctx.inertia.render('org/bookmarks/index', result.getValue())
  }
}
