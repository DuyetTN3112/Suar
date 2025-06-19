import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PageProps } from '@adonisjs/inertia/types'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

type SimpleOrganization = {
  id: string
  name: string
  logo: string | null
  plan: string | null
}

type AuthUser = {
  id: string
  email: string | null
  username: string
  system_role: string
  isAdmin: boolean
  current_organization_id: string | null
  organizations: SimpleOrganization[]
}

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext): Promise<PageProps> {
    const { session, auth } = ctx as Partial<HttpContext>

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' ? value : undefined
    }

    let authUser: AuthUser | null = null

    try {
      if (auth && (await auth.check())) {
        const user = auth.user
        if (user) {
          if (!user.$preloaded.organizations) {
            await user.load('organizations')
          }

          const systemRoleName = user.system_role
          const isAdmin = systemRoleName === 'superadmin' || systemRoleName === 'system_admin'

          const currentOrganizationId: string | null =
            (session?.get('current_organization_id') as string | undefined) ??
            user.current_organization_id ??
            null

          const organizations: SimpleOrganization[] = user.organizations.map((org) => ({
            id: org.id,
            name: org.name,
            logo: org.logo || null,
            plan: org.plan || null,
          }))

          authUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            system_role: systemRoleName,
            isAdmin,
            current_organization_id: currentOrganizationId,
            organizations,
          }
        }
      }
    } catch {
      // Auth check failed — return null user (guest)
    }

    const showModal = Boolean(session?.get('show_organization_required_modal', false))
    if (showModal && session) {
      session.forget('show_organization_required_modal')
      await session.commit()
    }

    const validationErrors = ctx.inertia.always(this.getValidationErrors(ctx))
    const flashError = toOptionalString(session?.flashMessages.get('error') as unknown)
    const flashSuccess = toOptionalString(session?.flashMessages.get('success') as unknown)

    return {
      csrfToken: ctx.request.csrfToken,
      showOrganizationRequiredModal: showModal,
      errors: validationErrors,
      flash: ctx.inertia.always({
        error: flashError,
        success: flashSuccess,
      }),
      auth: { user: authUser },
    }
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await this.init(ctx)

    await next()
    this.dispose(ctx)
  }
}
