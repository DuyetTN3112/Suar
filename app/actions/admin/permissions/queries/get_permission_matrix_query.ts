import { BaseQuery } from '#actions/shared/base_query'
import {
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
} from '#constants/permissions'
import {
  describePermission,
  formatRoleLabel,
  getRoleDescription,
  listKnownOrganizationPermissions,
  listProjectPermissionCatalog,
  listSystemPermissionCatalog,
} from '#libs/access_surface'

interface RoleMatrixEntry {
  code: string
  label: string
  description: string
  permissions: ReturnType<typeof describePermission>[]
  permissionCount: number
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
  handle(): Promise<PermissionMatrixResult> {
    const systemCatalog = listSystemPermissionCatalog()
    const organizationCatalog = listKnownOrganizationPermissions()
    const projectCatalog = listProjectPermissionCatalog()

    return Promise.resolve({
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
      systemRoles: buildRoleEntries(SYSTEM_ROLE_PERMISSIONS),
      organizationRoles: buildRoleEntries(ORG_ROLE_PERMISSIONS),
      projectRoles: buildRoleEntries(PROJECT_ROLE_PERMISSIONS),
      catalogs: {
        system: systemCatalog,
        organization: organizationCatalog,
        project: projectCatalog,
      },
    })
  }
}
