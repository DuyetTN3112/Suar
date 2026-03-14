import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ProjectRole } from '#constants/project_constants'
import { OrganizationRole } from '#constants/organization_constants'
import { canAddProjectMember } from '#domain/projects/project_permission_policy'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import ProjectMemberRepository from '#repositories/project_member_repository'

test.group('Integration | Project Members', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('addMember creates project member record', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const member = await ProjectMemberRepository.addMember(project.id, user.id, ProjectRole.MEMBER)
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

    await ProjectMemberRepository.addMember(project.id, owner.id, ProjectRole.OWNER)

    const result = await ProjectMemberRepository.isMember(project.id, owner.id)
    assert.isTrue(result)
  })

  test('isMember returns false for non-member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonMember = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const result = await ProjectMemberRepository.isMember(project.id, nonMember.id)
    assert.isFalse(result)
  })

  test('isProjectManagerOrOwner returns true for manager', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: manager.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberRepository.addMember(project.id, manager.id, ProjectRole.MANAGER)

    const result = await ProjectMemberRepository.isProjectManagerOrOwner(manager.id, project.id)
    assert.isTrue(result)
  })

  test('deleteMember removes project member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberRepository.addMember(project.id, user.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.deleteMember(project.id, user.id)

    const result = await ProjectMemberRepository.isMember(project.id, user.id)
    assert.isFalse(result)
  })

  test('updateRole changes member project role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberRepository.addMember(project.id, user.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.updateRole(project.id, user.id, ProjectRole.MANAGER)

    const roleName = await ProjectMemberRepository.getRoleName(project.id, user.id)
    assert.equal(roleName, ProjectRole.MANAGER)
  })

  test('getRoleName returns unknown for non-member', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonMember = await UserFactory.create()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const roleName = await ProjectMemberRepository.getRoleName(project.id, nonMember.id)
    assert.equal(roleName, 'unknown')
  })

  test('countByProjectIds returns correct counts', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user1 = await UserFactory.create()
    const user2 = await UserFactory.create()

    await OrganizationUserRepository.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.MEMBER,
    })
    await OrganizationUserRepository.addMember({
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

    await ProjectMemberRepository.addMember(project1.id, owner.id, ProjectRole.OWNER)
    await ProjectMemberRepository.addMember(project1.id, user1.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.addMember(project1.id, user2.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.addMember(project2.id, owner.id, ProjectRole.OWNER)

    const counts = await ProjectMemberRepository.countByProjectIds([project1.id, project2.id])
    assert.equal(counts.get(project1.id), 3)
    assert.equal(counts.get(project2.id), 1)
  })

  test('canAddProjectMember policy checks combine properly', async ({ assert }) => {
    // System admin can always add
    const result1 = canAddProjectMember({
      actorId: 'admin-1',
      actorSystemRole: 'superadmin',
      actorOrgRole: null,
      projectOwnerId: 'owner-1',
      projectCreatorId: 'creator-1',
      isTargetOrgMember: true,
      isAlreadyMember: false,
      targetRole: ProjectRole.MEMBER,
    })
    assert.isTrue(result1.allowed)

    // Cannot add already-member
    const result2 = canAddProjectMember({
      actorId: 'admin-1',
      actorSystemRole: 'superadmin',
      actorOrgRole: null,
      projectOwnerId: 'admin-1',
      projectCreatorId: 'admin-1',
      isTargetOrgMember: true,
      isAlreadyMember: true,
      targetRole: ProjectRole.MEMBER,
    })
    assert.isFalse(result2.allowed)
  })
})
