import { test } from '@japa/runner'

import type { NotificationCreator } from '#actions/notifications/public_api'
import TransferProjectOwnershipCommand from '#actions/projects/commands/transfer_project_ownership_command'
import { OrganizationRole } from '#constants/organization_constants'
import { ProjectRole } from '#constants/project_constants'
import AuditLog from '#infra/audit/models/audit_log'
import Project from '#infra/projects/models/project'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

class NotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  public handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

const notificationStub = {
  handle() {
    return Promise.resolve(null)
  },
} as unknown as NotificationCreator

test.group('Integration | Transfer Project Ownership', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('owner transfer persists role migration, audit trail, and owner change', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const newOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newOwner.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: ProjectRole.OWNER,
    })

    const command = new TransferProjectOwnershipCommand(
      ExecutionContext.system(owner.id),
      notificationStub
    )

    const transferredProject = await command.execute({
      project_id: project.id,
      new_owner_id: newOwner.id,
    })
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'project')
      .where('entity_id', project.id)
    const persistedProject = await Project.findOrFail(project.id)

    assert.equal(transferredProject.owner_id, newOwner.id)
    assert.equal(persistedProject.owner_id, newOwner.id)
    assert.equal(
      await ProjectMemberRepository.getRoleName(project.id, newOwner.id),
      ProjectRole.OWNER
    )
    assert.equal(
      await ProjectMemberRepository.getRoleName(project.id, owner.id),
      ProjectRole.MANAGER
    )
    assert.equal(auditLogs.length, 1)
  })

  test('successful transfer notifies both the new owner and the previous owner', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const newOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: newOwner.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: ProjectRole.OWNER,
    })

    const notificationSpy = new NotificationSpy()
    const command = new TransferProjectOwnershipCommand(
      ExecutionContext.system(owner.id),
      notificationSpy
    )

    await command.execute({
      project_id: project.id,
      new_owner_id: newOwner.id,
    })

    assert.lengthOf(notificationSpy.calls, 2)
    assert.equal(notificationSpy.calls[0]?.user_id, newOwner.id)
    assert.equal(notificationSpy.calls[1]?.user_id, owner.id)
    assert.equal(notificationSpy.calls[0]?.type, 'project_ownership_transferred')
    assert.equal(notificationSpy.calls[1]?.type, 'project_ownership_transferred')
  })

  test('unauthorized actor cannot transfer ownership and leaves project state unchanged', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    const targetOwner = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: targetOwner.id,
      org_role: OrganizationRole.MEMBER,
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: ProjectRole.OWNER,
    })

    const command = new TransferProjectOwnershipCommand(
      ExecutionContext.system(member.id),
      notificationStub
    )

    await assert.rejects(() =>
      command.execute({
        project_id: project.id,
        new_owner_id: targetOwner.id,
      })
    )

    const persistedProject = await Project.findOrFail(project.id)

    assert.equal(persistedProject.owner_id, owner.id)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, owner.id), ProjectRole.OWNER)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, targetOwner.id), 'unknown')
  })

  test('target owner must be an approved org member and the project stays unchanged on rejection', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: ProjectRole.OWNER,
    })

    const command = new TransferProjectOwnershipCommand(
      ExecutionContext.system(owner.id),
      notificationStub
    )

    await assert.rejects(() =>
      command.execute({
        project_id: project.id,
        new_owner_id: outsider.id,
      })
    )

    const persistedProject = await Project.findOrFail(project.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'project')
      .where('entity_id', project.id)

    assert.equal(persistedProject.owner_id, owner.id)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, owner.id), ProjectRole.OWNER)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, outsider.id), 'unknown')
    assert.equal(auditLogs.length, 0)
  })
})
