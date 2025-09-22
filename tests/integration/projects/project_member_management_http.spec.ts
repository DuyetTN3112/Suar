import { test } from '@japa/runner'

import ValidationException from '#modules/http/exceptions/validation_exception'
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

test.group('Integration | Project Member Management', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add-member rejects email-only payload (empty user_id), leaves project_members unchanged', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })

    // Verify the DTO rejects empty user_id
    const { AddProjectMemberDTO } = await import('#modules/projects/actions/dtos/request/add_project_member_dto')

    await assert.rejects(
      () => new AddProjectMemberDTO({
        project_id: project.id,
        user_id: '',
        project_role: ProjectRole.MEMBER,
      }),
      ValidationException
    )

    // Verify no new members were added
    const count = await ProjectMemberRepository.countByProject(project.id)
    assert.equal(count, 0)
  })

  test('add-member accepts user_id + explicit project_role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })

    // Add member directly via repository (simulating what the controller does after validation)
    await ProjectMemberRepository.addMember(project.id, member.id, ProjectRole.VIEWER)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(membership)
    assert.equal(membership?.project_role, ProjectRole.VIEWER)
  })

  test('add-member rejects non-owner actor', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonOwner = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: nonOwner.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const newMember = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: newMember.id, org_role: OrganizationRole.MEMBER })

    // Verify the permission policy denies non-owner
    const { canAddProjectMember } = await import('#modules/projects/domain/project_permission_policy')

    const result = canAddProjectMember({
      actorId: nonOwner.id,
      actorSystemRole: nonOwner.system_role,
      actorOrgRole: OrganizationRole.MEMBER,
      projectOwnerId: project.owner_id ?? '',
      projectCreatorId: project.creator_id,
      targetRole: ProjectRole.MEMBER,
      isTargetOrgMember: true,
      isAlreadyMember: false,
    })
    assert.isFalse(result.allowed)
  })

  test('add-member rejects duplicate membership', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: member.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: member.id, project_role: ProjectRole.MEMBER })

    const before = await ProjectMemberRepository.countByProject(project.id)
    assert.equal(before, 1)

    // Try to add duplicate - should throw
    await assert.rejects(
      () => ProjectMemberRepository.addMember(project.id, member.id, ProjectRole.VIEWER)
    )

    const after = await ProjectMemberRepository.countByProject(project.id)
    assert.equal(after, before)
  })
})
