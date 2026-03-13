import { test } from '@japa/runner'

import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { ProjectRole } from '#modules/projects/constants/project_constants'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Project Member Role Management', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner can update member role via service layer', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    // Direct service call — bypasses HTTP middleware but tests business logic
    await ProjectMemberRepository.updateRole(project.id, member.id, ProjectRole.MANAGER)

    const updated = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(updated)
    assert.equal(updated!.project_role, ProjectRole.MANAGER)
  })

  test('owner can remove member via service layer', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    await ProjectMemberRepository.deleteMember(project.id, member.id)

    const deleted = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNull(deleted)
  })

  test('update role then verify in DB persists correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    // Update role
    await ProjectMemberRepository.updateRole(project.id, member.id, ProjectRole.MANAGER)
    const afterUpdate = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.equal(afterUpdate!.project_role, ProjectRole.MANAGER)

    // Update again
    await ProjectMemberRepository.updateRole(project.id, member.id, ProjectRole.VIEWER)
    const afterSecondUpdate = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.equal(afterSecondUpdate!.project_role, ProjectRole.VIEWER)
  })

  test('remove member then verify re-add works', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    // Remove
    await ProjectMemberRepository.deleteMember(project.id, member.id)
    assert.isNull(await ProjectMemberRepository.findMember(project.id, member.id))

    // Re-add
    await ProjectMemberRepository.addMember(project.id, member.id, ProjectRole.VIEWER)
    const readded = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(readded)
    assert.equal(readded!.project_role, ProjectRole.VIEWER)
  })

  test('update member role via repository — owner can update', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    // Update role via repository (simulating what the controller does)
    await ProjectMemberRepository.updateRole(project.id, member.id, ProjectRole.MANAGER)

    const updated = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(updated)
    assert.equal(updated!.project_role, ProjectRole.MANAGER)
  })
})
