import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/members/organization_user_repository/write/mutation_queries'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project-members/project_member_repository'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

async function countAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db.from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

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

  test('add-member route accepts camelCase request aliases', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const response = await client
      .post('/projects/members')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
        userId: member.id,
        projectRole: ProjectRole.VIEWER,
      })

    response.assertStatus(204)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(membership)
    assert.equal(membership?.project_role, ProjectRole.VIEWER)
  })

  test('add-member route persists optional professional role assignment', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const { ProfessionalRoleRepository } = await import('#modules/skills/infra/repositories/project-roles/professional_role_repository')
    const projectRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: project.id,
      code: 'backend_lead',
      name: 'Backend Lead',
      created_by: owner.id,
    })

    const response = await client
      .post('/projects/members')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
        userId: member.id,
        projectRole: ProjectRole.VIEWER,
        projectProfessionalRoleId: projectRole.id,
      })

    response.assertStatus(204)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(membership)
    assert.equal(membership?.project_professional_role_id, projectRole.id)
    assert.equal(
      await countAuditEvents('project.member_addition.completed', 'project_member', member.id),
      1
    )
  })

  test('update-member route accepts camelCase request aliases', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: ProjectRole.MEMBER,
    })

    const response = await client
      .put(`/projects/members/${member.id}`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
        projectRole: ProjectRole.MANAGER,
      })

    response.assertStatus(204)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(membership)
    assert.equal(membership?.project_role, ProjectRole.MANAGER)
    assert.equal(
      await countAuditEvents('project.member_update.completed', 'project_member', member.id),
      1
    )
  })

  test('update-member route updates optional professional role assignment', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: ProjectRole.MEMBER,
    })
    const { ProfessionalRoleRepository } = await import('#modules/skills/infra/repositories/project-roles/professional_role_repository')
    const projectRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: project.id,
      code: 'frontend_lead',
      name: 'Frontend Lead',
      created_by: owner.id,
    })

    const response = await client
      .put(`/projects/members/${member.id}`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
        projectRole: ProjectRole.MANAGER,
        projectProfessionalRoleId: projectRole.id,
      })

    response.assertStatus(204)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNotNull(membership)
    assert.equal(membership?.project_professional_role_id, projectRole.id)
    assert.equal(
      await countAuditEvents('project.member_update.completed', 'project_member', member.id),
      1
    )
  })

  test('remove-member route accepts camelCase request aliases', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: ProjectRole.MEMBER,
    })

    const response = await client
      .delete(`/projects/members/${member.id}`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
      })

    response.assertStatus(204)

    const membership = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.isNull(membership)
    assert.equal(
      await countAuditEvents('project.member_removal.completed', 'project_member', member.id),
      1
    )
  })

  test('add-member rejects non-owner actor', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const nonOwner = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: nonOwner.id, org_role: OrganizationRole.MEMBER })
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const newMember = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: newMember.id, org_role: OrganizationRole.MEMBER })

    // Verify the permission policy denies non-owner
    const { canAddProjectMember } = await import('#modules/projects/domain/project-members/project_permission_policy')

    const result = canAddProjectMember({
      actorId: nonOwner.id,
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
