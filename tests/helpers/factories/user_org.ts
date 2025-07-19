import { testEmail, testId, testSlug, testUsername } from '../test_utils.js'

import type { OrganizationUserStatus } from '#constants/organization_constants'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import User from '#models/user'

type OrgUserStatus = `${OrganizationUserStatus}`

export const UserFactory = {
  async create(
    overrides: Partial<{
      id: string
      username: string
      email: string | null
      status: string
      system_role: string
      auth_method: 'google' | 'github'
      is_freelancer: boolean
      current_organization_id: string | null
      timezone: string
      language: string
      credibility_data: import('#types/database').UserCredibilityData | null
    }> = {}
  ): Promise<User> {
    return User.create({
      id: overrides.id ?? testId(),
      username: overrides.username ?? testUsername(),
      email: overrides.email !== undefined ? overrides.email : testEmail(),
      status: overrides.status ?? 'active',
      system_role: overrides.system_role ?? 'registered_user',
      auth_method: overrides.auth_method ?? 'google',
      is_freelancer: overrides.is_freelancer ?? false,
      current_organization_id: overrides.current_organization_id ?? null,
      timezone: overrides.timezone ?? 'Asia/Ho_Chi_Minh',
      language: overrides.language ?? 'vi',
      ...(overrides.credibility_data !== undefined && {
        credibility_data: overrides.credibility_data,
      }),
    })
  },

  async createSuperadmin(
    overrides: Partial<{ id: string; username: string; email: string }> = {}
  ): Promise<User> {
    return this.create({ system_role: 'superadmin', ...overrides })
  },

  async createFreelancer(
    overrides: Partial<{ id: string; username: string; email: string }> = {}
  ): Promise<User> {
    return this.create({ is_freelancer: true, ...overrides })
  },
}

export const OrganizationUserFactory = {
  async create(
    overrides: Partial<{
      organization_id: string
      user_id: string
      org_role: string
      status: OrgUserStatus
      invited_by: string | null
    }> = {}
  ): Promise<OrganizationUser> {
    return OrganizationUser.create({
      organization_id: overrides.organization_id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      org_role: overrides.org_role ?? 'org_member',
      status: (overrides.status ?? 'approved') as OrganizationUserStatus,
      invited_by: overrides.invited_by ?? null,
    })
  },
}

export const OrganizationFactory = {
  async create(
    overrides: Partial<{
      id: string
      name: string
      slug: string
      owner_id: string
      plan: string | null
      description: string | null
    }> = {}
  ): Promise<Organization> {
    let ownerId = overrides.owner_id
    if (ownerId === undefined) {
      const owner = await UserFactory.create()
      ownerId = owner.id
    }

    return Organization.create({
      id: overrides.id ?? testId(),
      name: overrides.name ?? `Test Org ${Math.random().toString(36).substring(2, 6)}`,
      slug: overrides.slug ?? testSlug(),
      owner_id: ownerId,
      plan: overrides.plan ?? null,
      description: overrides.description ?? null,
    })
  },

  async createWithOwner(
    orgOverrides: Partial<{
      name: string
      slug: string
      plan: string | null
    }> = {},
    userOverrides: Partial<{
      username: string
      email: string
      system_role: string
    }> = {}
  ): Promise<{ org: Organization; owner: User }> {
    const owner = await UserFactory.create(userOverrides)
    const org = await this.create({ owner_id: owner.id, ...orgOverrides })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: org.id }).save()
    return { org, owner }
  },
}
