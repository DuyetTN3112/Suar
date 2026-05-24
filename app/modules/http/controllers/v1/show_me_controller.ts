import type { HttpContext } from '@adonisjs/core/http'

import { mapApiV1MeResponse } from '#modules/http/api_v1/response_mappers'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

export default class ShowMeController {
  async handle(ctx: HttpContext) {
    const { auth, session } = ctx

    await auth.check()
    const user = auth.user

    if (!user) {
      return null
    }

    if (!user.$preloaded.organizations) {
      await user.load('organizations')
    }
    if (!user.$preloaded.organization_users) {
      await user.load('organization_users')
    }

    const currentOrganizationId: string | null =
      (session.get('current_organization_id') as string | undefined) ??
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

    const organizations = user.organizations
      .map((organization) => {
        const membership = membershipByOrganizationId.get(organization.id)
        return {
          id: organization.id,
          name: organization.name,
          logo: organization.logo ?? null,
          org_role: membership?.org_role ?? null,
          status: membership?.status ?? null,
        }
      })
      .filter((organization) => organization.status === OrganizationUserStatus.APPROVED)

    const currentMembership = currentOrganizationId
      ? membershipByOrganizationId.get(currentOrganizationId)
      : undefined

    return mapApiV1MeResponse({
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
      system_role: user.system_role,
      current_organization_id: currentOrganizationId,
      current_organization_role: currentMembership?.org_role ?? null,
      organizations,
    })
  }
}
