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
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'

test.group('Integration | Project Members', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('project member lifecycle persists through add, role update, and delete', async ({
    assert,
  }) => {
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
    assert.equal(member.project_role, ProjectRole.MEMBER)
    assert.isTrue(await ProjectMemberRepository.isMember(project.id, user.id))

    await ProjectMemberRepository.updateRole(project.id, user.id, ProjectRole.MANAGER)
    const roleName = await ProjectMemberRepository.getRoleName(project.id, user.id)
    assert.equal(roleName, ProjectRole.MANAGER)

    await ProjectMemberRepository.deleteMember(project.id, user.id)
    assert.isFalse(await ProjectMemberRepository.isMember(project.id, user.id))
  })

  test('manager membership is recognized by repository role checks', async ({ assert }) => {
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
    assert.isTrue(await ProjectMemberRepository.isProjectManagerOrOwner(manager.id, project.id))
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
})
