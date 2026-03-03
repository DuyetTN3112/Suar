import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_ORGANIZATIONS_SPECS } from './organization_seeds_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { OrgKey, SeededOrg, SeededUser, UserKey } from './types.js'

export async function seedOrganizations(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>
): Promise<Record<OrgKey, SeededOrg>> {
  const specs = SEED_ORGANIZATIONS_SPECS
  const result: Partial<Record<OrgKey, SeededOrg>> = {}

  for (const [key, spec] of Object.entries(specs) as [OrgKey, (typeof specs)[OrgKey]][]) {
    const existing = await findRow(trx, 'organizations', { slug: spec.slug })
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
      logo: `https://api.dicebear.com/9.x/shapes/svg?seed=${spec.slug}`,
      website: `https://${spec.slug}.local`,
      plan: spec.plan,
      owner_id: users[spec.owner].id,
      custom_roles: runtime.toJson([
        {
          name: 'tech_lead',
          permissions: ['manage_projects', 'manage_tasks', 'review_code'],
          description: 'Technical lead',
        },
      ]),
      partner_type: key === 'orgA' ? 'gold' : null,
      partner_verified_at: key === 'orgA' ? runtime.isoDaysAgo(45) : null,
      partner_verified_by: key === 'orgA' ? users.superadmin.id : null,
      partner_verification_proof:
        key === 'orgA' ? 'Seeded verification proof for local admin testing' : null,
      partner_expires_at: key === 'orgA' ? runtime.isoDaysAhead(180) : null,
      partner_is_active: key === 'orgA',
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(2),
    }

    if (existing) {
      await trx.from('organizations').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('organizations')
        .insert({ id, ...payload })
    }

    result[key] = { id, name: spec.name, slug: spec.slug }
  }

  return result as Record<OrgKey, SeededOrg>
}

export async function seedOrganizationMemberships(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  organizations: Record<OrgKey, SeededOrg>
): Promise<void> {
  const memberships: {
    organization: OrgKey
    user: UserKey
    role: 'org_owner' | 'org_admin' | 'org_member'
    status: 'approved' | 'pending'
    invitedBy?: UserKey
  }[] = [
    { organization: 'orgA', user: 'owner', role: 'org_owner', status: 'approved' },
    {
      organization: 'orgA',
      user: 'orgAdmin',
      role: 'org_admin',
      status: 'approved',
      invitedBy: 'owner',
    },
    {
      organization: 'orgA',
      user: 'member',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'owner',
    },
    {
      organization: 'orgA',
      user: 'peerReviewer',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'orgAdmin',
    },
    {
      organization: 'orgA',
      user: 'freelancerOne',
      role: 'org_member',
      status: 'pending',
      invitedBy: 'owner',
    },
    { organization: 'orgB', user: 'orgBOwner', role: 'org_owner', status: 'approved' },
    {
      organization: 'orgB',
      user: 'owner',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'orgBOwner',
    },
    {
      organization: 'orgB',
      user: 'member',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'orgBOwner',
    },
    { organization: 'orgC', user: 'peerReviewer', role: 'org_owner', status: 'approved' },
    {
      organization: 'orgC',
      user: 'owner',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'peerReviewer',
    },
    {
      organization: 'orgC',
      user: 'orgAdmin',
      role: 'org_admin',
      status: 'approved',
      invitedBy: 'peerReviewer',
    },
    { organization: 'orgD', user: 'freelancerOne', role: 'org_owner', status: 'approved' },
    {
      organization: 'orgD',
      user: 'owner',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'freelancerOne',
    },
    {
      organization: 'orgD',
      user: 'freelancerTwo',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'freelancerOne',
    },
    { organization: 'orgE', user: 'freelancerTwo', role: 'org_owner', status: 'approved' },
    {
      organization: 'orgE',
      user: 'owner',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'freelancerTwo',
    },
    {
      organization: 'orgE',
      user: 'member',
      role: 'org_member',
      status: 'approved',
      invitedBy: 'freelancerTwo',
    },
    {
      organization: 'orgE',
      user: 'orgAdmin',
      role: 'org_admin',
      status: 'approved',
      invitedBy: 'freelancerTwo',
    },
  ]

  for (const item of memberships) {
    const where = {
      organization_id: organizations[item.organization].id,
      user_id: users[item.user].id,
    }
    const existing = await findRow(trx, 'organization_users', where)
    const payload = {
      org_role: item.role,
      status: item.status,
      invited_by: item.invitedBy ? users[item.invitedBy].id : null,
      created_at: runtime.isoDaysAgo(item.status === 'approved' ? 60 : 2),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('organization_users'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('organization_users')
        .insert({ ...where, ...payload })
    }
  }
}

export async function updateCurrentOrganizations(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  organizations: Record<OrgKey, SeededOrg>
): Promise<void> {
  const updates: [UserKey, string | null][] = [
    ['owner', organizations.orgA.id],
    ['member', organizations.orgA.id],
    ['orgAdmin', organizations.orgA.id],
    ['peerReviewer', organizations.orgA.id],
    ['orgBOwner', organizations.orgB.id],
    ['superadmin', null],
    ['freelancerOne', null],
    ['freelancerTwo', organizations.orgE.id],
  ]

  for (const [userKey, currentOrgId] of updates) {
    await trx
      .from('users')
      .where('id', users[userKey].id)
      .update({
        current_organization_id: currentOrgId,
        updated_at: runtime.isoDaysAgo(1),
      })
  }
}
