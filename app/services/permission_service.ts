import { canManageProject } from './permission_service/composite_scope.js'
import {
  checkOrgPermission,
  getOrgMembership,
  getUserOrgRoleLevel,
  isOrgAdminOrOwner,
  isOrgOwner,
} from './permission_service/organization_scope.js'
import {
  checkProjectPermission,
  getProjectMembership,
  getUserProjectRoleLevel,
  isProjectManagerOrOwner,
  isProjectOwner,
} from './permission_service/project_scope.js'
import {
  checkSystemPermission,
  getSystemRoleInfo,
  isSystemAdmin,
  isSystemSuperadmin,
} from './permission_service/system_scope.js'
import { canUserUpdateTask, canUserViewTask } from './permission_service/task_scope.js'

export {
  canManageProject,
  checkOrgPermission,
  checkProjectPermission,
  checkSystemPermission,
  getOrgMembership,
  getProjectMembership,
  getSystemRoleInfo,
  getUserOrgRoleLevel,
  getUserProjectRoleLevel,
  isOrgAdminOrOwner,
  isOrgOwner,
  isProjectManagerOrOwner,
  isProjectOwner,
  isSystemAdmin,
  isSystemSuperadmin,
  canUserUpdateTask,
  canUserViewTask,
}

const PermissionService = {
  // System
  isSystemSuperadmin,
  isSystemAdmin,
  checkSystemPermission,
  getSystemRoleInfo,

  // Organization
  getOrgMembership,
  isOrgOwner,
  isOrgAdminOrOwner,
  getUserOrgRoleLevel,
  checkOrgPermission,

  // Project
  getProjectMembership,
  isProjectOwner,
  isProjectManagerOrOwner,
  getUserProjectRoleLevel,
  checkProjectPermission,

  // Task
  canUserUpdateTask,
  canUserViewTask,

  // Composite
  canManageProject,
} as const

export default PermissionService
