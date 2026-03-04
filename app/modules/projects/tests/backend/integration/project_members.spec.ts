import { test } from '@japa/runner'

import { projectMembershipCommandFactory } from '#composition/project_membership_composition'
import { OrganizationRole } from '#modules/organizations/access/public_contracts/organization_constants'
import * as membershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { RemoveProjectMemberDTO } from '#modules/projects/actions/dtos/request/remove_project_member_dto'
import { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

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

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { ProfessionalRoleRepository } = await import('#modules/skills/infra/repositories/professional_role_repository')
    const professionalRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: project.id,
      code: 'qa_lead',
      name: 'QA Lead',
      created_by: owner.id,
    })

    const member = await ProjectMemberRepository.addMember(
      project.id,
      user.id,
      ProjectRole.MEMBER,
      professionalRole.id
    )
    assert.equal(member.project_role, ProjectRole.MEMBER)
    assert.equal(member.project_professional_role_id, professionalRole.id)
    assert.isTrue(await ProjectMemberRepository.isMember(project.id, user.id))

    await ProjectMemberRepository.updateRole(project.id, user.id, ProjectRole.MANAGER, null)
    const updatedMembership = await ProjectMemberRepository.findMember(project.id, user.id)
    const roleName = await ProjectMemberRepository.getRoleName(project.id, user.id)
    assert.equal(roleName, ProjectRole.MANAGER)
    assert.isNull(updatedMembership?.project_professional_role_id)

    await ProjectMemberRepository.deleteMember(project.id, user.id)
    assert.isFalse(await ProjectMemberRepository.isMember(project.id, user.id))
  })

  test('manager membership is recognized by repository role checks', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()

    await membershipMutations.addMember({
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

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user1.id,
      org_role: OrganizationRole.MEMBER,
    })
    await membershipMutations.addMember({
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

  test('add project member command rejects professional role from another project', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const otherProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const { ProfessionalRoleRepository } = await import(
      '#modules/skills/infra/repositories/professional_role_repository'
    )
    const foreignRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: otherProject.id,
      code: 'foreign_role',
      name: 'Foreign Role',
      created_by: owner.id,
    })

    const command = projectMembershipCommandFactory.makeAddMember(makeSystemProjectActionContext(owner.id))

    await assert.rejects(
      () =>
        command.handle(
          new AddProjectMemberDTO({
            project_id: project.id,
            user_id: user.id,
            project_role: ProjectRole.MEMBER,
            project_professional_role_id: foreignRole.id,
          })
        ),
      'Professional role không thuộc dự án này'
    )
  })

  test('add project member command rejects users outside the project organization', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const command = projectMembershipCommandFactory.makeAddMember(makeSystemProjectActionContext(owner.id))

    await assert.rejects(
      () =>
        command.handle(
          new AddProjectMemberDTO({
            project_id: project.id,
            user_id: outsider.id,
            project_role: ProjectRole.MEMBER,
          })
        ),
      'Thành viên không thuộc tổ chức hoặc chưa được duyệt'
    )

    assert.isNull(await ProjectMemberRepository.findMember(project.id, outsider.id))
  })

  test('add project member command rejects duplicate members without adding another row', async ({
    assert,
  }) => {
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
    await ProjectMemberRepository.addMember(project.id, member.id, ProjectRole.MEMBER)
    const before = await ProjectMemberRepository.countByProject(project.id)
    const command = projectMembershipCommandFactory.makeAddMember(makeSystemProjectActionContext(owner.id))

    await assert.rejects(
      () =>
        command.handle(
          new AddProjectMemberDTO({
            project_id: project.id,
            user_id: member.id,
            project_role: ProjectRole.VIEWER,
          })
        ),
      'Người dùng đã là thành viên của dự án'
    )

    assert.equal(await ProjectMemberRepository.countByProject(project.id), before)
    const persistedMember = await ProjectMemberRepository.findMember(project.id, member.id)
    assert.equal(persistedMember?.project_role, ProjectRole.MEMBER)
  })

  test('update project member command rejects professional role from another project', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const otherProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberRepository.addMember(project.id, user.id, ProjectRole.MEMBER)

    const { ProfessionalRoleRepository } = await import(
      '#modules/skills/infra/repositories/professional_role_repository'
    )
    const foreignRole = await ProfessionalRoleRepository.createProjectRole({
      project_id: otherProject.id,
      code: 'foreign_role',
      name: 'Foreign Role',
      created_by: owner.id,
    })

    const command = projectMembershipCommandFactory.makeUpdateMember(makeSystemProjectActionContext(owner.id))

    await assert.rejects(
      () =>
        command.handle(
          new UpdateProjectMemberDTO({
            project_id: project.id,
            user_id: user.id,
            project_role: ProjectRole.MANAGER,
            project_professional_role_id: foreignRole.id,
          })
        ),
      'Professional role không thuộc dự án này'
    )
  })

  test('plain project members cannot update or remove project members', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const actor = await UserFactory.create()
    const target = await UserFactory.create()
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: actor.id,
      org_role: OrganizationRole.MEMBER,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: target.id,
      org_role: OrganizationRole.MEMBER,
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberRepository.addMember(project.id, actor.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.addMember(project.id, target.id, ProjectRole.MEMBER)
    const updateCommand = projectMembershipCommandFactory.makeUpdateMember(makeSystemProjectActionContext(actor.id))
    const removeCommand = projectMembershipCommandFactory.makeRemoveMember(
      makeSystemProjectActionContext(actor.id)
    )

    await assert.rejects(
      () =>
        updateCommand.handle(
          new UpdateProjectMemberDTO({
            project_id: project.id,
            user_id: target.id,
            project_role: ProjectRole.MANAGER,
          })
        ),
      'Bạn không có quyền cập nhật dự án này'
    )
    await assert.rejects(
      () =>
        removeCommand.handle(
          new RemoveProjectMemberDTO({
            project_id: project.id,
            user_id: target.id,
          })
        ),
      'Chỉ owner hoặc admin mới có thể xóa thành viên khỏi dự án'
    )

    const persistedTarget = await ProjectMemberRepository.findMember(project.id, target.id)
    assert.equal(persistedTarget?.project_role, ProjectRole.MEMBER)
  })

  test('update member authorization uses actor project role, not target project role', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const actor = await UserFactory.create()
    const targetManager = await UserFactory.create()
    const managerActor = await UserFactory.create()
    const targetMember = await UserFactory.create()

    for (const user of [actor, targetManager, managerActor, targetMember]) {
      await membershipMutations.addMember({
        organization_id: org.id,
        user_id: user.id,
        org_role: OrganizationRole.MEMBER,
      })
    }

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberRepository.addMember(project.id, actor.id, ProjectRole.MEMBER)
    await ProjectMemberRepository.addMember(project.id, targetManager.id, ProjectRole.MANAGER)
    await ProjectMemberRepository.addMember(project.id, managerActor.id, ProjectRole.MANAGER)
    await ProjectMemberRepository.addMember(project.id, targetMember.id, ProjectRole.MEMBER)

    const unauthorizedCommand = projectMembershipCommandFactory.makeUpdateMember(
      makeSystemProjectActionContext(actor.id)
    )
    await assert.rejects(
      () =>
        unauthorizedCommand.handle(
          new UpdateProjectMemberDTO({
            project_id: project.id,
            user_id: targetManager.id,
            project_role: ProjectRole.MEMBER,
          })
        ),
      'Bạn không có quyền cập nhật dự án này'
    )

    const managerCommand = projectMembershipCommandFactory.makeUpdateMember(
      makeSystemProjectActionContext(managerActor.id)
    )
    await managerCommand.handle(
      new UpdateProjectMemberDTO({
        project_id: project.id,
        user_id: targetMember.id,
        project_role: ProjectRole.VIEWER,
      })
    )

    const persistedTargetManager = await ProjectMemberRepository.findMember(
      project.id,
      targetManager.id
    )
    const persistedTargetMember = await ProjectMemberRepository.findMember(
      project.id,
      targetMember.id
    )
    assert.equal(persistedTargetManager?.project_role, ProjectRole.MANAGER)
    assert.equal(persistedTargetMember?.project_role, ProjectRole.VIEWER)
  })
})
