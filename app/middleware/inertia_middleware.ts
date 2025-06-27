import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { PageProps } from '@adonisjs/inertia/types'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import { OrganizationUserStatus } from '#constants/organization_constants'

type SimpleOrganization = {
  id: string
  name: string
  logo: string | null
  org_role: string | null
  status: OrganizationUserStatus | null
}

type AuthUser = {
  id: string
  email: string | null
  username: string
  avatar_url: string | null
  system_role: string
  isAdmin: boolean
  current_organization_id: string | null
  current_organization_role: string | null
  organizations: SimpleOrganization[]
}

type InterfaceContext = {
  canSwitchToAdmin: boolean
  isAdminMode: boolean
}

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  async share(ctx: HttpContext): Promise<PageProps> {
    const { session, auth } = ctx as Partial<HttpContext>

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' ? value : undefined
    }

    let authUser: AuthUser | null = null
    let interfaceContext: InterfaceContext = {
      canSwitchToAdmin: false,
      isAdminMode: false,
    }

    try {
      if (auth && (await auth.check())) {
        const user = auth.user
        if (user) {
          if (!user.$preloaded.organizations) {
            await user.load('organizations')
          }
          if (!user.$preloaded.organization_users) {
            await user.load('organization_users')
          }

          const systemRoleName = user.system_role
          const isAdmin = systemRoleName === 'superadmin' || systemRoleName === 'system_admin'

          const currentOrganizationId: string | null =
            (session?.get('current_organization_id') as string | undefined) ??
            user.current_organization_id ??
            null

          const membershipByOrganizationId = new Map(
            user.organization_users.map((membership) => [
              membership.organization_id,
              {
                org_role: membership.org_role,
                status: membership.status,
              },
            ])
          )

          const organizations: SimpleOrganization[] = user.organizations
            .map((org) => {
              const membership = membershipByOrganizationId.get(org.id)
              return {
                id: org.id,
                name: org.name,
                logo: org.logo || null,
                org_role: membership?.org_role ?? null,
                status: membership?.status ?? null,
              }
            })
            .filter((org) => org.status === OrganizationUserStatus.APPROVED)

          const currentMembership = currentOrganizationId
            ? membershipByOrganizationId.get(currentOrganizationId)
            : undefined

          authUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
            system_role: systemRoleName,
            isAdmin,
            current_organization_id: currentOrganizationId,
            current_organization_role: currentMembership?.org_role ?? null,
            organizations,
          }

          interfaceContext = {
            canSwitchToAdmin: isAdmin,
            isAdminMode: isAdmin && Boolean(session?.get('is_admin_mode', false)),
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
      context: ctx.inertia.always(interfaceContext),
    }
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await this.init(ctx)

    await next()
    this.dispose(ctx)
  }
}
