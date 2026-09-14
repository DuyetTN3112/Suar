import type { ApiClient, ApiResponse } from '@japa/api-client'

import { OrganizationFactory, OrganizationUserFactory } from '#tests/helpers/factories'

export interface TokenPairApiBody {
  data: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    refreshExpiresIn: number
    organizationId: string | null
    systemRole: string
  }
}

export function readTokenPairApiBody(
  response: ApiResponse | { body(): unknown }
): TokenPairApiBody {
  return response.body() as TokenPairApiBody
}

export async function setupDualOrgUserWithRefreshedToken(
  client: ApiClient,
  secondaryOrgName: string,
  secondaryOrgSlugPrefix: string
) {
  const { org: primaryOrg, owner } = await OrganizationFactory.createWithOwner()
  const secondaryOrg = await OrganizationFactory.create({
    owner_id: owner.id,
    name: secondaryOrgName,
    slug: `${secondaryOrgSlugPrefix}-${Date.now()}`,
  })

  await OrganizationUserFactory.create({
    organization_id: secondaryOrg.id,
    user_id: owner.id,
    org_role: 'org_owner',
    status: 'approved',
  })

  await owner.merge({ current_organization_id: primaryOrg.id }).save()

  const issueResponse = await client.post('/api/auth/token').loginAs(owner)
  issueResponse.assertStatus(200)
  const issueBody = readTokenPairApiBody(issueResponse)

  const refreshResponse = await client.post('/api/auth/refresh').form({
    refresh_token: issueBody.data.refreshToken,
    organization_id: secondaryOrg.id,
  })
  refreshResponse.assertStatus(200)
  const refreshBody = readTokenPairApiBody(refreshResponse)

  return {
    primaryOrg,
    secondaryOrg,
    owner,
    accessToken: refreshBody.data.accessToken,
    refreshToken: refreshBody.data.refreshToken,
  }
}
