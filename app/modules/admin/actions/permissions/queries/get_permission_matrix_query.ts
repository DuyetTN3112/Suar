import { BaseQuery } from '#modules/admin/actions/base_query'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
  listSystemPermissionCatalog,
} from '#modules/authorization/public_contracts/access_surface'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#modules/authorization/public_contracts/permissions'
import { CustomSystemRoleService } from '#modules/authorization/services/custom_system_role_service'

interface RoleMatrixEntry {
  code: string
  label: string
  description: string
  permissions: ReturnType<typeof describePermission>[]
  permissionCount: number
  isCustom?: boolean
  id?: string
}

export interface PermissionMatrixResult {
  summary: {
    totalRoleGroups: number
    totalRoles: number
    totalUniquePermissions: number
  }
  systemRoles: RoleMatrixEntry[]
  organizationRoles: RoleMatrixEntry[]
  projectRoles: RoleMatrixEntry[]
  catalogs: {
    system: ReturnType<typeof listSystemPermissionCatalog>
    organization: ReturnType<typeof listKnownOrganizationPermissions>
    project: ReturnType<typeof listProjectPermissionCatalog>
  }
}

const buildRoleEntries = (map: Record<string, readonly string[]>): RoleMatrixEntry[] => {
  return Object.entries(map).map(([code, permissions]) => ({
    code,
    label: formatRoleLabel(code),
    description: getRoleDescription(code),
    permissions: permissions.map((permission) => describePermission(permission)),
    permissionCount: permissions.length,
  }))
}

export default class GetPermissionMatrixQuery extends BaseQuery<
  Record<string, never>,
  PermissionMatrixResult
> {
  async handle(): Promise<PermissionMatrixResult> {
    const systemCatalog = listSystemPermissionCatalog()
    const organizationCatalog = listKnownOrganizationPermissions()
    const projectCatalog = listProjectPermissionCatalog()

    const customSystemRoles = await CustomSystemRoleService.getAllCustomRoles()
    const customSystemRoleEntries: RoleMatrixEntry[] = customSystemRoles.map((role) => ({
      code: role.code,
      label: role.name,
      description: role.description || 'Vai trò tùy chỉnh cấp hệ thống',
      permissions: role.permissions.map((p) => describePermission(p)),
      permissionCount: role.permissions.length,
      isCustom: true,
      id: role.id,
    }))

    const allSystemRoles = [
      ...buildRoleEntries(SYSTEM_ROLE_PERMISSIONS),
      ...customSystemRoleEntries,
    ]

    return {
      summary: {
        totalRoleGroups: 3,
        totalRoles:
          Object.keys(SYSTEM_ROLE_PERMISSIONS).length +
          Object.keys(ORG_ROLE_PERMISSIONS).length +
          Object.keys(PROJECT_ROLE_PERMISSIONS).length,
        totalUniquePermissions: new Set([
          ...systemCatalog.map((entry) => entry.key),
          ...organizationCatalog.map((entry) => entry.key),
          ...projectCatalog.map((entry) => entry.key),
        ]).size,
      },
      systemRoles: allSystemRoles,
      organizationRoles: buildRoleEntries(ORG_ROLE_PERMISSIONS),
      projectRoles: buildRoleEntries(PROJECT_ROLE_PERMISSIONS),
      catalogs: {
        system: systemCatalog,
        organization: organizationCatalog,
        project: projectCatalog,
      },
    }
  }
}
