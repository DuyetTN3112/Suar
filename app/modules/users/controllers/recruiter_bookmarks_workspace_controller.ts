import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import ListRecruiterBookmarksWorkspaceQuery from '#modules/users/actions/queries/list_recruiter_bookmarks_workspace_query'

export default class RecruiterBookmarksWorkspaceController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      ctx.session.flash('error', 'Bạn cần chọn tổ chức trước khi xem bookmark talent.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      ctx.session.flash('error', 'Bookmark talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const q = ctx.request.input('q') as unknown
    const folder = ctx.request.input('folder') as unknown

    const result = await new ListRecruiterBookmarksWorkspaceQuery(actionContextFromHttp(ctx)).handle({
      q: typeof q === 'string' ? q : undefined,
      folder: typeof folder === 'string' ? folder : undefined,
    })

    return ctx.inertia.render('marketplace/bookmarks', result)
  }
}
