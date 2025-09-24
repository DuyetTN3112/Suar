import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'

export default class TalentDirectoryPageController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      ctx.session.flash('error', 'Bạn cần chọn tổ chức trước khi xem danh bạ talent.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const membership = await organizationPublicApi.getMembershipContext(organizationId, userId)
    if (!organizationPublicApi.canAccessAdminShell(membership?.role ?? null).allowed) {
      ctx.session.flash('error', 'Danh bạ talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const q = ctx.request.input('q') as unknown
    const taskId = ctx.request.input('task_id') as unknown

    const result = await new GetTalentDirectoryPageQuery(actionContextFromHttp(ctx)).handle({
      q: typeof q === 'string' ? q : undefined,
      task_id: typeof taskId === 'string' ? taskId : undefined,
    })

    return ctx.inertia.render('marketplace/talents', result)
  }
}
