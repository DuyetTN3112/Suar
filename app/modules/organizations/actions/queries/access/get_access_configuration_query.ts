import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
} from '#modules/authorization/public_contracts/access_surface'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
} from '#modules/authorization/public_contracts/permissions'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationAdministrationRepository } from '#modules/organizations/actions/ports/outbound/access/organization_administration_repository'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/access/organization_persistence'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import {
  ORG_ROLE_PRESETS,
  buildOrganizationDepartmentCoverage,
  sanitizeCustomRoleDefinitions,
} from '#modules/organizations/domain/access/org_access_rules'
import { canUpdateOrganization } from '#modules/organizations/domain/access/org_permission_policy'

interface RoleEntry {
  code: string
  label: string
  description: string
  permissions: ReturnType<typeof describePermission>[]
  permissionCount: number
  isBuiltIn: boolean
  memberCount: number
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

export default class GetAccessConfigurationQuery extends BaseQuery<
  Record<string, never>,
  AccessConfigurationResult
> {
  constructor(
    execCtx: OrganizationActionContext,
    private readonly administration: OrganizationAdministrationRepository,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super(execCtx)
  }

  async handle(): Promise<AccessConfigurationResult> {
    const organizationId = this.getCurrentOrganizationId()
    const userId = this.getCurrentUserId()

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }
    if (!userId) {
      throw new UnauthorizedException()
    }

    const actorMembership = await this.memberships.getContext(organizationId, userId)
    const actorOrgRole = actorMembership?.role ?? null
    enforcePolicy(canUpdateOrganization(actorOrgRole))

    const organization = await this.organizations.findActiveOrFail(organizationId)
    const customRoles = sanitizeCustomRoleDefinitions(organization.custom_roles ?? [])

    const [memberStats, roleDistributionRows] = await Promise.all([
      this.administration.getMemberStats(organizationId),
      this.administration.getRoleDistribution(organizationId),
    ])

    const roleDistribution = roleDistributionRows

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
