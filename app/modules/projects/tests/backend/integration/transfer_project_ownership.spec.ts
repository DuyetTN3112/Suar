import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { ProjectOrganizationReaderAdapter } from '#composition/adapters/projects/project_organization_reader_adapter'
import { ProjectUserReaderAdapter } from '#composition/adapters/projects/project_user_reader_adapter'
import { notificationApplication as notificationPublicApi } from '#composition/notifications/notification-feed/notification_composition'
import {
  projectLifecycleRepository,
  projectMembershipRepository,
  projectTransactionRunner,
} from '#composition/projects/project-membership/project_persistence_composition'
import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import TransferProjectOwnershipCommand from '#modules/projects/actions/commands/project-members/transfer_project_ownership_command'
import type { ProjectNotificationStager as NotificationStager } from '#modules/projects/actions/ports/outbound/project_notification_stager'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/project-context/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/project-context/in_process_project_event_publisher'
import Project from '#modules/projects/infra/models/project-context/project'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project-members/project_member_repository'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

const notificationStub: NotificationStager = {
  stage() {
    return Promise.resolve(null)
  },
}
const organizationReader = new ProjectOrganizationReaderAdapter()
const userReader = new ProjectUserReaderAdapter()
const projectEvents = new InProcessProjectEventPublisher()
const auditEvents = new AuditEventProjectAuditEventPublisher()

function makeTransferCommand(
  context: ReturnType<typeof makeSystemProjectActionContext>,
  notification: NotificationStager
) {
  return new TransferProjectOwnershipCommand(
    context,
    projectTransactionRunner,
    projectLifecycleRepository,
    projectMembershipRepository,
    notification,
    organizationReader,
    userReader,
    projectEvents,
    auditEvents
  )
}

class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('project ownership notification staging failed'))
  }
}

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

    const command = makeTransferCommand(
      makeSystemProjectActionContext(owner.id),
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

    const command = makeTransferCommand(
      makeSystemProjectActionContext(owner.id),
      notificationPublicApi
    )

    const transferredProject = await command.execute({
      project_id: project.id,
      new_owner_id: newOwner.id,
    })

    const notifications = (await db
      .from('notifications')
      .select('event_id', 'user_id', 'title', 'message', 'action')
      .where('type', 'project_ownership_transferred')
      .where('related_entity_id', project.id)
      .orderBy('user_id', 'asc')) as {
      event_id: string
      user_id: string
      title: string
      message: string
      action: { routeName?: string } | null
    }[]
    assert.lengthOf(notifications, 2)

    const occurredAt = transferredProject.updated_at
    assert.isNotNull(occurredAt)
    if (!occurredAt) return
    for (const recipientId of [newOwner.id, owner.id]) {
      const notification = notifications.find((candidate) => candidate.user_id === recipientId)
      assert.isDefined(notification)
      if (!notification) continue
      assert.equal(
        notification.event_id,
        buildNotificationEventId({
          eventName: 'project.ownership_transferred',
          businessEventId: `${project.id}:${owner.id}:${newOwner.id}:${occurredAt}`,
          recipientId,
        })
      )
      assert.include(notification.message, project.name)
      assert.equal(notification.action?.routeName, 'projects.show')
    }
    assert.equal(
      notifications.find((candidate) => candidate.user_id === newOwner.id)?.title,
      'Bạn đã trở thành project owner'
    )
    assert.equal(
      notifications.find((candidate) => candidate.user_id === owner.id)?.title,
      'Đã chuyển giao quyền sở hữu project'
    )
    assert.lengthOf(
      await db.from('notification_outbox').whereIn(
        'source_event_id',
        notifications.map((notification) => notification.event_id)
      ),
      4
    )
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

    const command = makeTransferCommand(
      makeSystemProjectActionContext(member.id),
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

    const command = makeTransferCommand(
      makeSystemProjectActionContext(owner.id),
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

  test('required notification staging failure rolls back project, roles, and audit', async ({
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
    const notification = new FailingNotificationStager()
    const command = makeTransferCommand(
      makeSystemProjectActionContext(owner.id),
      notification
    )

    await assert.rejects(
      () =>
        command.execute({
          project_id: project.id,
          new_owner_id: newOwner.id,
        }),
      'project ownership notification staging failed'
    )

    const persistedProject = await Project.findOrFail(project.id)
    const auditLogs = await AuditLog.query()
      .where('entity_type', 'project')
      .where('entity_id', project.id)
      .where('action', 'transfer_ownership')

    assert.equal(notification.calls, 1)
    assert.equal(persistedProject.owner_id, owner.id)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, owner.id), ProjectRole.OWNER)
    assert.equal(await ProjectMemberRepository.getRoleName(project.id, newOwner.id), 'unknown')
    assert.lengthOf(auditLogs, 0)
  })
})
