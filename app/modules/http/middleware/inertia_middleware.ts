import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'
import type { PageProps } from '@adonisjs/inertia/types'

import { customSystemRoleApi } from '#modules/authorization/public_contracts/custom_system_role_api'
import { SYSTEM_ROLE_PERMISSIONS } from '#modules/authorization/public_contracts/permissions'
import { HttpOrganizationReader } from '#modules/http/actions/ports/outbound/http_organization_reader'
import { InertiaProjectDirectory } from '#modules/http/actions/ports/outbound/inertia_project_directory'
import { canAccessOrganizationAdminShell } from '#modules/organizations/access/public_contracts/organization_access'
import type { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import { mergeUserSetting } from '#modules/settings/public_contracts/user_setting'

type JsonObject = Record<string, JSONDataTypes>

type SimpleOrganization = JsonObject & {
  id: string
  name: string
  logo: string | null
  org_role: string | null
  status: OrganizationUserStatus | null
}

type SystemAuthUser = JsonObject & {
  realm: 'system'
  id: string
  email: string | null
  username: string
  avatar_url: string | null
  system_role: string
  system_permissions: string[]
  user_setting: JsonObject
}

type WorkspaceAuthUser = JsonObject & {
  realm: 'user'
  id: string
  email: string | null
  username: string
  avatar_url: string | null
  current_organization_id: string | null
  current_organization_role: string | null
  user_setting: JsonObject
  organizations: SimpleOrganization[]
  current_project: { id: string; name: string } | null
  projects: { id: string; name: string }[]
}

type InterfaceContext = JsonObject & {
  realm: 'system' | 'user'
}

type WorkspaceAccess = JsonObject & {
  realm: 'user'
  personal: {
    canEnter: true
  }
  organization: {
    id: string
    role: string | null
    canEnterManagement: boolean
  } | null
  projects: Array<{
    id: string
    name: string
    canEnter: true
  }>
}

type InertiaRootViewSetter = {
  setRootView?: (view: string) => void
}

@inject()
export default class InertiaMiddleware extends BaseInertiaMiddleware {
  constructor(
    private readonly projectDirectory: InertiaProjectDirectory,
    private readonly organizationReader: HttpOrganizationReader
  ) {
    super()
  }

  private async resolveSystemPermissions(systemRoleName: string): Promise<string[]> {
    const builtInPermissions = SYSTEM_ROLE_PERMISSIONS[systemRoleName]
    if (builtInPermissions) {
      return [...builtInPermissions]
    }

    try {
      return (await customSystemRoleApi.getRolePermissions(systemRoleName)) ?? []
    } catch {
      return []
    }
  }

  async share(ctx: HttpContext): Promise<PageProps> {
    const { session, auth } = ctx as Partial<HttpContext>
    const requestPath = ctx.request.url()
    const isApiRequest = requestPath === '/api' || requestPath.startsWith('/api/')
    const isSystemSurface = requestPath === '/admin' || requestPath.startsWith('/admin/')

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' ? value : undefined
    }

    let authUser: SystemAuthUser | WorkspaceAuthUser | null = null
    let interfaceContext: InterfaceContext = {
      realm: isSystemSurface ? 'system' : 'user',
    }
    let workspaceAccess: WorkspaceAccess | null = null

    if (!isApiRequest && auth && (await auth.check())) {
      const user = auth.user
      if (user) {
        if (isSystemSurface) {
          const systemRoleName = user.system_role
          const systemPermissions = await this.resolveSystemPermissions(systemRoleName)

          authUser = {
            realm: 'system',
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
            system_role: systemRoleName,
            system_permissions: systemPermissions,
            user_setting: mergeUserSetting(user.user_setting) as unknown as JsonObject,
          }
          interfaceContext = { realm: 'system' }
        } else {
          const currentOrganizationId: string | null =
            (session?.get('current_organization_id') as string | undefined) ??
            user.current_organization_id ??
            null

          const organizationMemberships =
            await this.organizationReader.listApprovedMembershipSummaries(user.id)
          const organizations: SimpleOrganization[] = organizationMemberships.map((membership) => ({
            id: membership.id,
            name: membership.name,
            logo: membership.logo,
            org_role: membership.orgRole,
            status: membership.status as OrganizationUserStatus,
          }))

          const currentMembership = currentOrganizationId
            ? organizationMemberships.find((membership) => membership.id === currentOrganizationId)
            : undefined
          const canEnterOrganizationWorkspace = canAccessOrganizationAdminShell(
            (currentMembership?.orgRole ?? null) as 'org_owner' | 'org_admin' | 'org_member' | null
          ).allowed

          let userProjects: { id: string; name: string }[] = []
          let currentProject: { id: string; name: string } | null = null

          if (currentOrganizationId && currentMembership) {
            userProjects = await this.projectDirectory.listAccessibleByOrganization({
              organizationId: currentOrganizationId,
              userId: user.id,
              canManageOrganization: canEnterOrganizationWorkspace,
            })
            const currentProjectId: string | null =
              (session?.get('current_project_id') as string | undefined) ?? null

            if (currentProjectId) {
              const matchedProj = userProjects.find((project) => project.id === currentProjectId)
              if (matchedProj) {
                currentProject = { id: matchedProj.id, name: matchedProj.name }
              } else if (session) {
                session.forget('current_project_id')
              }
            }

            if (!currentProject && userProjects.length > 0) {
              const firstProj = userProjects[0]
              if (firstProj) {
                currentProject = { id: firstProj.id, name: firstProj.name }
                if (session) {
                  session.put('current_project_id', firstProj.id)
                }
              }
            }

            if (session) {
              await session.commit()
            }
          }

          authUser = {
            realm: 'user',
            id: user.id,
            email: user.email,
            username: user.username,
            avatar_url: user.avatar_url,
            current_organization_id: currentOrganizationId,
            current_organization_role: currentMembership?.orgRole ?? null,
            user_setting: mergeUserSetting(user.user_setting) as unknown as JsonObject,
            organizations,
            current_project: currentProject,
            projects: userProjects,
          }

          workspaceAccess = {
            realm: 'user',
            personal: { canEnter: true },
            organization:
              currentOrganizationId && currentMembership
                ? {
                    id: currentOrganizationId,
                    role: currentMembership.orgRole,
                    canEnterManagement: canEnterOrganizationWorkspace,
                  }
                : null,
            projects: userProjects.map((project) => ({
              ...project,
              canEnter: true as const,
            })),
          }
          interfaceContext = { realm: 'user' }
        }
      }
    }

    const showModal = Boolean(session?.get('show_organization_required_modal', false))
    if (showModal && session) {
      session.forget('show_organization_required_modal')
      await session.commit()
    }

    const validationErrors = ctx.inertia.always(this.getValidationErrors(ctx))
    const flashError = toOptionalString(session?.flashMessages.get('error') as unknown)
    const flashSuccess = toOptionalString(session?.flashMessages.get('success') as unknown)

    const sharedProps: PageProps = {
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

    return interfaceContext.realm === 'user'
      ? {
          ...sharedProps,
          workspaceAccess,
        }
      : sharedProps
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    await this.init(ctx)

    // Dynamically set root view for Multi-SPA architecture
    const url = ctx.request.url()
    const inertia = ctx.inertia as InertiaRootViewSetter
    if (url.startsWith('/admin')) {
      inertia.setRootView?.('inertia_admin')
    } else if (url.startsWith('/org')) {
      inertia.setRootView?.('inertia_org')
    } else {
      inertia.setRootView?.('inertia_user')
    }

    try {
      await next()
    } finally {
      this.dispose(ctx)
    }
  }
}
