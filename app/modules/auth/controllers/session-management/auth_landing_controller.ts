import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { ResolveAuthLandingQuery } from '#modules/auth/actions/queries/session-management/resolve_auth_landing_query'

@inject()
export default class AuthLandingController {
  constructor(private readonly resolveLanding: ResolveAuthLandingQuery) {}

  async root(ctx: HttpContext): Promise<unknown> {
    return this.redirectToLanding(ctx)
  }

  async dashboard(ctx: HttpContext): Promise<unknown> {
    return this.redirectToLanding(ctx)
  }

  private async redirectToLanding(ctx: HttpContext): Promise<unknown> {
    const user = ctx.auth.user
    if (!user) {
      ctx.response.redirect().toPath('/login')
      return
    }
    const path = await this.resolveLanding.executeAndWrap({
      id: user.id,
      systemRole: user.system_role,
      currentOrganizationId: user.current_organization_id ?? null,
    }).then((outcome) => outcome.getValue())

    if (path === '/dashboard') {
      return ctx.inertia.render('index', {})
    }

    return ctx.response.redirect().toPath(path)
  }
}
