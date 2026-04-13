import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

export default class MyInvitationsPageController {
  async handle(ctx: HttpContext) {
    const { inertia } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const userId = execCtx.userId

    if (!userId) {
      throw new UnauthorizedException()
    }

    const invitationsPage = await organizationPublicApi.findPendingInvitationsPageByUser(userId, {
      page: ctx.request.input('page'),
      perPage:
        (ctx.request.input('perPage') as unknown) ??
        (ctx.request.input('per_page') as unknown) ??
        (ctx.request.input('limit') as unknown),
    })

    const formattedInvitations = invitationsPage.data.map((invitation) => {
      const organization = invitation.organization as typeof invitation.organization | null
      const inviter = invitation.inviter as typeof invitation.inviter | null

      return {
        organization_id: invitation.organization_id,
        organization_name: organization?.name,
        organization_logo: organization?.logo,
        org_role: invitation.org_role,
        invited_by: inviter ? {
          id: inviter.id,
          username: inviter.username,
          email: inviter.email,
          avatar_url: inviter.avatar_url,
        } : null,
        created_at: invitation.created_at,
      }
    })

    // @ts-expect-error - Route string type is dynamically generated
    return inertia.render('profile/invitations', {
      invitations: formattedInvitations,
      pagination: toCanonicalPagePagination(invitationsPage.meta),
    })
  }
}
