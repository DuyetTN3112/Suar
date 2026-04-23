import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseQuery } from '#actions/shared/base_query'
import { ORG_ROLE_PERMISSIONS, PROJECT_ROLE_PERMISSIONS } from '#constants/permissions'
import {
  ORG_ROLE_PRESETS,
  buildOrganizationDepartmentCoverage,
  sanitizeCustomRoleDefinitions,
} from '#domain/organizations/org_access_rules'
import { canUpdateOrganization } from '#domain/organizations/org_permission_policy'
import OrganizationMemberRepository from '#infra/organizations/current/repositories/organization_member_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
} from '#libs/access_surface'
import Organization from '#models/organization'
import type { ExecutionContext } from '#types/execution_context'

interface RoleEntry {
  code: string
  label: string
  description: string
  permissions: ReturnType<typeof describePermission>[]
  permissionCount: number
  isBuiltIn: boolean
  memberCount: number
}

interface RoleDistributionRow {
  org_role: string
  total: number | string
}

export interface AccessConfigurationResult {
  organization: {
    id: string
    name: string
    slug: string
    description: string | null
  }
  summary: {
    approvedMembers: number
    pendingInvitations: number
    builtInRoleCount: number
    customRoleCount: number
  }
  organizationRoles: RoleEntry[]
  projectRoles: RoleEntry[]
  permissionCatalog: ReturnType<typeof listKnownOrganizationPermissions>
  projectPermissionCatalog: ReturnType<typeof listProjectPermissionCatalog>
  rolePresets: typeof ORG_ROLE_PRESETS
  departments: {
    id: string
    name: string
    description: string
    focus: string
    suggestedRoles: string[]
    matchedRoles: string[]
    estimatedHeadcount: number
  }[]
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default class GetAccessConfigurationQuery extends BaseQuery<
  Record<string, never>,
  AccessConfigurationResult
> {
  constructor(
    execCtx: ExecutionContext,
    private memberRepo = new OrganizationMemberRepository()
  ) {
    super(execCtx)
  }

  async handle(): Promise<AccessConfigurationResult> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()

    if (!organizationId) {
      throw new Error('Organization context required')
    }
    if (!userId) {
      throw new Error('User context required')
    }

    const actorMembership = await OrganizationUserRepository.getMembershipContext(
      organizationId,
      userId
    )
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canUpdateOrganization(actorOrgRole))

    const organization = await Organization.findOrFail(organizationId)
    const customRoles = sanitizeCustomRoleDefinitions(organization.custom_roles ?? [])

    const [memberStats, roleDistributionRows] = await Promise.all([
      this.memberRepo.getMemberStats(organizationId),
      db
        .from('organization_users')
        .select('org_role')
        .count('* as total')
        .where('organization_id', organizationId)
        .where('status', 'approved')
        .groupBy('org_role'),
    ])

    const roleDistribution = new Map<string, number>()
    for (const row of roleDistributionRows as RoleDistributionRow[]) {
      const roleName = row.org_role
      if (!roleName) continue
      roleDistribution.set(roleName, toNumberValue(row.total))
    }

    const builtInRoles: RoleEntry[] = Object.entries(ORG_ROLE_PERMISSIONS).map(
      ([code, permissions]) => ({
        code,
        label: formatRoleLabel(code),
        description: getRoleDescription(code),
        permissions: permissions.map((permission) => describePermission(permission)),
        permissionCount: permissions.length,
        isBuiltIn: true,
        memberCount: roleDistribution.get(code) ?? 0,
      })
    )

    const customRoleEntries: RoleEntry[] = customRoles.map((role) => ({
      code: role.name,
      label: formatRoleLabel(role.name),
      description: role.description ?? getRoleDescription(role.name),
      permissions: role.permissions.map((permission) => describePermission(permission)),
      permissionCount: role.permissions.length,
      isBuiltIn: false,
      memberCount: roleDistribution.get(role.name) ?? 0,
    }))

    const projectRoles: RoleEntry[] = Object.entries(PROJECT_ROLE_PERMISSIONS).map(
      ([code, permissions]) => ({
        code,
        label: formatRoleLabel(code),
        description: getRoleDescription(code),
        permissions: permissions.map((permission) => describePermission(permission)),
        permissionCount: permissions.length,
        isBuiltIn: true,
        memberCount: 0,
      })
    )

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
      },
      summary: {
        approvedMembers: memberStats.total,
        pendingInvitations: memberStats.pendingInvitations,
        builtInRoleCount: builtInRoles.length,
        customRoleCount: customRoleEntries.length,
      },
      organizationRoles: [...builtInRoles, ...customRoleEntries],
      projectRoles,
      permissionCatalog: listKnownOrganizationPermissions(customRoles),
      projectPermissionCatalog: listProjectPermissionCatalog(),
      rolePresets: ORG_ROLE_PRESETS,
      departments: buildOrganizationDepartmentCoverage(roleDistribution),
    }
  }
}
