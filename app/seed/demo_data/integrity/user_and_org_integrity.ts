import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_ORGANIZATIONS_SPECS } from '../organization_seeds_specs.js'
import type { SeedContext } from '../types.js'
import { SEED_USERS_SPECS } from '../user_seeds_specs.js'

import { countRowsWhere, fail } from './seed_integrity_helpers.js'

interface UserIntegrityRow {
  id: string
  email: string
  system_role: string
  current_organization_id: string | null
}

interface MembershipIntegrityRow {
  org_role: string
  status: string
}

export async function requireUser(
  trx: TransactionClientContract,
  id: string,
  expectedEmail: string,
  expectedRole: string
): Promise<UserIntegrityRow> {
  const row = (await trx.from('users').where('id', id).first()) as UserIntegrityRow | null
  if (!row) {
    fail(`missing user ${expectedEmail}`)
  }

  if (row.email !== expectedEmail) {
    fail(`user ${expectedEmail} email mismatch`)
  }

  if (row.system_role !== expectedRole) {
    fail(`user ${expectedEmail} expected role ${expectedRole}, got ${row.system_role}`)
  }

  return row
}

export async function requireMembership(
  trx: TransactionClientContract,
  organizationId: string,
  userId: string,
  role: string
): Promise<void> {
  const row = (await trx
    .from('organization_users')
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .first()) as MembershipIntegrityRow | null

  if (!row) {
    fail(`missing membership ${userId} -> ${organizationId}`)
  }

  if (row.org_role !== role || row.status !== 'approved') {
    fail(`membership ${userId} -> ${organizationId} expected ${role}/approved`)
  }
}

export async function assertUserAndOrgIntegrity(
  trx: TransactionClientContract,
  context: SeedContext
): Promise<void> {
  const mainUserSpec = SEED_USERS_SPECS.owner
  const superadminSpec = SEED_USERS_SPECS.superadmin
  const secondaryOwnerSpec = SEED_USERS_SPECS.orgBOwner
  const primaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgA
  const secondaryOrgSpec = SEED_ORGANIZATIONS_SPECS.orgB

  const mainUser = context.users.owner
  const superadmin = context.users.superadmin
  const secondaryOwner = context.users.orgBOwner
  const primaryOrg = context.organizations.orgA
  const secondaryOrg = context.organizations.orgB

  if (primaryOrg.slug !== primaryOrgSpec.slug || secondaryOrg.slug !== secondaryOrgSpec.slug) {
    fail('canonical organization slugs mismatch')
  }

  const superadminRow = await requireUser(trx, superadmin.id, superadminSpec.email, 'superadmin')
  const mainUserRow = await requireUser(trx, mainUser.id, mainUserSpec.email, 'registered_user')
  await requireUser(trx, secondaryOwner.id, secondaryOwnerSpec.email, 'registered_user')

  if (!mainUserRow.current_organization_id) {
    fail('main user must have a current approved organization context')
  }
  const mainUserCurrentMembership = await countRowsWhere(trx, 'organization_users', {
    organization_id: mainUserRow.current_organization_id,
    user_id: mainUser.id,
    status: 'approved',
  })
  if (mainUserCurrentMembership !== 1) {
    fail('main user current organization must reference an approved membership')
  }

  const invalidCurrentOrganizationUsers = (await trx
    .from('users as user')
    .leftJoin('organization_users as membership', (join) => {
      join
        .on('membership.user_id', '=', 'user.id')
        .andOn('membership.organization_id', '=', 'user.current_organization_id')
        .andOnVal('membership.status', '=', 'approved')
    })
    .whereNotNull('user.current_organization_id')
    .whereNull('membership.user_id')
    .count('* as total')
    .first()) as { total: string | number } | null
  const superadminMemberships = await countRowsWhere(trx, 'organization_users', {
    user_id: superadmin.id,
  })
  if (
    Number(invalidCurrentOrganizationUsers?.total ?? 0) > 0 ||
    superadminRow.current_organization_id !== null ||
    superadminMemberships !== 0
  ) {
    fail(
      'current organization requires approved membership, while system admins stay outside organization membership'
    )
  }

  await requireMembership(trx, primaryOrg.id, mainUser.id, 'org_owner')
  await requireMembership(trx, secondaryOrg.id, mainUser.id, 'org_member')
  await requireMembership(trx, secondaryOrg.id, secondaryOwner.id, 'org_owner')

  const mainUserProviderCount = await countRowsWhere(trx, 'user_oauth_providers', {
    user_id: mainUser.id,
    provider: mainUser.authMethod,
  })
  if (mainUserProviderCount < 1) {
    fail('main user must retain at least one OAuth identity for the configured auth method')
  }

  if (Object.keys(context.projects).length < Object.keys(SEED_ORGANIZATIONS_SPECS).length) {
    fail('not enough projects linked to organizations')
  }

  const projectsWithInsufficientMembers = (await trx
    .from('projects as project')
    .leftJoin('project_members as member', 'member.project_id', 'project.id')
    .groupBy('project.id')
    .havingRaw('COUNT(DISTINCT member.user_id) < 2')
    .select('project.id')) as { id: string }[]
  const projectsWithInsufficientSkillCatalog = (await trx
    .from('projects as project')
    .leftJoin('project_skills as skill', (join) => {
      join.on('skill.project_id', '=', 'project.id').andOnVal('skill.is_active', '=', true)
    })
    .groupBy('project.id')
    .havingRaw('COUNT(DISTINCT skill.skill_id) < 4')
    .select('project.id')) as { id: string }[]
  const invalidProjectLeaders = (await trx
    .from('projects as project')
    .where((builder) => {
      for (const column of ['creator_id', 'owner_id', 'manager_id']) {
        void builder.orWhereRaw(
          `NOT EXISTS (
            SELECT 1
            FROM organization_users AS membership
            WHERE membership.organization_id = project.organization_id
              AND membership.user_id = project.${column}
              AND membership.status = 'approved'
          )`
        )
      }
    })
    .count('* as total')
    .first()) as { total: string | number } | null
  if (
    projectsWithInsufficientMembers.length > 0 ||
    projectsWithInsufficientSkillCatalog.length > 0 ||
    Number(invalidProjectLeaders?.total ?? 0) > 0
  ) {
    fail(
      `projects require approved leaders, at least two members, and a four-skill catalog (member gaps=${projectsWithInsufficientMembers.length}, skill gaps=${projectsWithInsufficientSkillCatalog.length}, leader gaps=${Number(invalidProjectLeaders?.total ?? 0)})`
    )
  }
}
