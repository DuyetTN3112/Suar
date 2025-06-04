import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import ProjectMember from '#models/project_member'
import OrganizationUser from '#models/organization_user'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import { SystemRoleName } from '#constants/user_constants'
import {
  canCreateTask,
  canUpdateTask,
  canDeleteTask,
  canAssignTask,
  canViewTask,
  canPermanentDeleteTask,
  calculateTaskPermissions,
} from '#actions/tasks/rules/task_permission_policy'

test.group('Integration | Task Permissions', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('org admin can create task', async ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: true,
      isProjectManagerOrOwner: false,
      hasProjectId: false,
    })
    assert.isTrue(result.allowed)
  })

  test('project manager can create task in project', async ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: true,
      hasProjectId: true,
    })
    assert.isTrue(result.allowed)
  })

  test('regular member cannot create task', async ({ assert }) => {
    const result = canCreateTask({
      isOrgAdminOrOwner: false,
      isProjectManagerOrOwner: false,
      hasProjectId: false,
    })
    assert.isFalse(result.allowed)
  })

  test('task creator can update task', async ({ assert }) => {
    const userId = 'user-1'
    const result = canUpdateTask({
      actorId: userId,
      actorSystemRole: SystemRoleName.REGISTERED_USER,
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: null,
      taskCreatorId: userId,
      taskAssignedTo: null,
      isActiveAssignee: false,
    })
    assert.isTrue(result.allowed)
  })

  test('task assignee can update task', async ({ assert }) => {
    const userId = 'user-1'
    const result = canUpdateTask({
      actorId: userId,
      actorSystemRole: SystemRoleName.REGISTERED_USER,
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: null,
      taskCreatorId: 'other-user',
      taskAssignedTo: userId,
      isActiveAssignee: true,
    })
    assert.isTrue(result.allowed)
  })

  test('superadmin can update any task', async ({ assert }) => {
    const result = canUpdateTask({
      actorId: 'admin-1',
      actorSystemRole: SystemRoleName.SUPERADMIN,
      actorOrgRole: null,
      actorProjectRole: null,
      taskCreatorId: 'other-user',
      taskAssignedTo: null,
      isActiveAssignee: false,
    })
    assert.isTrue(result.allowed)
  })

  test('only superadmin can permanently delete', async ({ assert }) => {
    const allowed = canPermanentDeleteTask({
      actorSystemRole: SystemRoleName.SUPERADMIN,
    })
    assert.isTrue(allowed.allowed)

    const denied = canPermanentDeleteTask({
      actorSystemRole: SystemRoleName.REGISTERED_USER,
    })
    assert.isFalse(denied.allowed)
  })

  test('calculateTaskPermissions returns correct flags', async ({ assert }) => {
    const userId = 'user-1'
    const perms = calculateTaskPermissions({
      actorId: userId,
      actorSystemRole: SystemRoleName.REGISTERED_USER,
      actorOrgRole: OrganizationRole.MEMBER,
      actorProjectRole: ProjectRole.MEMBER,
      taskCreatorId: userId,
      taskAssignedTo: null,
      isActiveAssignee: false,
    })

    assert.isTrue(perms.isCreator)
    assert.isFalse(perms.isAssignee)
    assert.isTrue(perms.canEdit)
  })
})
