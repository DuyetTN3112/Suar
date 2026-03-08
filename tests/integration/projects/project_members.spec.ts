import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import ProjectMember from '#models/project_member'
import OrganizationUser from '#models/organization_user'
import { ProjectRole } from '#constants/project_constants'
import { OrganizationRole } from '#constants/organization_constants'
import {
  canAddProjectMember,
  canRemoveProjectMember,
  canManageProjectMembers,
} from '#actions/projects/rules/project_permission_policy'

test.group('Integration | Project Members', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('addMember creates project member record', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const member = await ProjectMember.addMember(project.id, user.id, ProjectRole.MEMBER)
    assert.isNotNull(member)
    assert.equal(member.project_id, project.id)
    assert.equal(member.user_id, user.id)
    assert.equal(member.project_role, ProjectRole.MEMBER)
  })

  test('isMember returns true for project member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMember.addMember(project.id, owner.id, ProjectRole.OWNER)

    const result = await ProjectMember.isMember(project.id, owner.id)
    assert.isTrue(result)
  })

  test('isMember returns false for non-member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonMember = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const result = await ProjectMember.isMember(project.id, nonMember.id)
    assert.isFalse(result)
  })

  test('isProjectManagerOrOwner returns true for manager', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: manager.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMember.addMember(project.id, manager.id, ProjectRole.MANAGER)

    const result = await ProjectMember.isProjectManagerOrOwner(manager.id, project.id)
    assert.isTrue(result)
  })

  test('deleteMember removes project member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMember.addMember(project.id, user.id, ProjectRole.MEMBER)
    await ProjectMember.deleteMember(project.id, user.id)

    const result = await ProjectMember.isMember(project.id, user.id)
    assert.isFalse(result)
  })

  test('updateRole changes member project role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMember.addMember(project.id, user.id, ProjectRole.MEMBER)
    await ProjectMember.updateRole(project.id, user.id, ProjectRole.MANAGER)

    const roleName = await ProjectMember.getRoleName(project.id, user.id)
    assert.equal(roleName, ProjectRole.MANAGER)
  })

  test('getRoleName returns unknown for non-member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonMember = await UserFactory.create()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const roleName = await ProjectMember.getRoleName(project.id, nonMember.id)
    assert.equal(roleName, 'unknown')
  })

  test('countByProjectIds returns correct counts', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.MEMBER,
    })
    await OrganizationUser.addMember({
      organization_id: org.id,
      user_id: user2.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project1 = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const project2 = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    await ProjectMember.addMember(project1.id, owner.id, ProjectRole.OWNER)
    await ProjectMember.addMember(project1.id, user1.id, ProjectRole.MEMBER)
    await ProjectMember.addMember(project1.id, user2.id, ProjectRole.MEMBER)
    await ProjectMember.addMember(project2.id, owner.id, ProjectRole.OWNER)

    const counts = await ProjectMember.countByProjectIds([project1.id, project2.id])
    assert.equal(counts.get(project1.id), 3)
    assert.equal(counts.get(project2.id), 1)
  })

  test('canAddProjectMember policy checks combine properly', async ({ assert }) => {
    // System admin can always add
    const result1 = canAddProjectMember({
      actorSystemRole: 'superadmin',
      actorOrgRole: null,
      isProjectOwner: false,
      isProjectCreator: false,
      actorProjectRole: null,
      isTargetOrgMember: true,
      isTargetAlreadyMember: false,
      targetRole: ProjectRole.MEMBER,
    })
    assert.isTrue(result1.allowed)

    // Cannot add already-member
    const result2 = canAddProjectMember({
      actorSystemRole: 'superadmin',
      actorOrgRole: null,
      isProjectOwner: true,
      isProjectCreator: true,
      actorProjectRole: ProjectRole.OWNER,
      isTargetOrgMember: true,
      isTargetAlreadyMember: true,
      targetRole: ProjectRole.MEMBER,
    })
    assert.isFalse(result2.allowed)
  })
})
