import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import { makeGetUserNotifications } from '#composition/notification_feed_composition'
import { organizationTaskWorkflowInitializer } from '#composition/organization_notification_composition'
import {
  organizationEventPublisher,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organization_persistence_composition'
import { organizationUserReaderWriter } from '#composition/organization_user_composition'
import AuditLog from '#modules/audit/infra/models/audit_log'
import CreateOrganizationCommand from '#modules/organizations/directory/actions/command/create_organization_command'
import { CreateOrganizationDTO } from '#modules/organizations/directory/actions/dtos/request/create_organization_dto'
import { makeSystemOrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationEventPublisher } from '#modules/organizations/directory/actions/ports/outbound/organization_event_publisher'
import type { OrganizationNotificationStager as NotificationStager } from '#modules/organizations/directory/actions/ports/outbound/organization_notification_stager'
import Organization from '#modules/organizations/directory/infra/models/organization'
import OrganizationUser from '#modules/organizations/members/infra/models/organization_user'
import TaskStatusModel from '#modules/tasks/infra/models/task_status'
import { DEFAULT_TASK_STATUSES } from '#modules/tasks/public_contracts/task_constants'
import User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

class FailingNotification implements NotificationStager {
  public stageCalls = 0

  public stage(): Promise<never> {
    this.stageCalls += 1
    return Promise.reject(new Error('notification staging failed'))
  }
}

class NoopNotification implements NotificationStager {
  public stage(): Promise<void> {
    return Promise.resolve()
  }
}

class NoopOrganizationEventPublisher implements OrganizationEventPublisher {
  public publishOrganizationCreated(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationUpdated(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationDeleted(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationMemberAdded(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationMemberRemoved(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationMemberRoleChanged(): Promise<void> {
    return Promise.resolve()
  }
  public publishOrganizationMemberApproved(): Promise<void> {
    return Promise.resolve()
  }
}

async function createOrganizationAs(
  userId: string,
  name: string,
  options?: {
    notification?: NotificationStager
    eventPublisher?: OrganizationEventPublisher
  }
) {
  const command = new CreateOrganizationCommand(
    makeSystemOrganizationActionContext(userId),
    options?.notification ?? notificationPublicApi,
    organizationUserReaderWriter,
    organizationTaskWorkflowInitializer,
    organizationTransactionRunner,
    organizationReader,
    organizationWriter,
    organizationMembershipRepository,
    options?.eventPublisher ?? organizationEventPublisher
  )
  return command.execute(new CreateOrganizationDTO(name))
}

test.group('Integration | Create Organization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creation seeds owner context, default workflow, audit log, and welcome notification', async ({
    assert,
  }) => {
    const user = await UserFactory.create()

    const organization = await createOrganizationAs(user.id, 'Platform Guild')
    const membership = await OrganizationUser.query()
      .where('organization_id', organization.id)
      .where('user_id', user.id)
      .first()
    const refreshedUser = await User.findOrFail(user.id)
    const statuses = await TaskStatusModel.query()
      .where('organization_id', organization.id)
      .orderBy('sort_order', 'asc')
    const notifications = await makeGetUserNotifications(
      makeSystemOrganizationActionContext(user.id)
    ).handle({
      page: 1,
      limit: 10,
    })
    const logs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', organization.id)

    assert.equal(organization.owner_id, user.id)
    assert.isNull(organization.plan)
    assert.isTrue(organization.slug.length > 0)
    assert.isNotNull(membership)
    assert.equal(membership?.org_role, 'org_owner')
    assert.equal(membership?.status, 'approved')
    assert.equal(refreshedUser.current_organization_id, organization.id)
    assert.equal(statuses.length, DEFAULT_TASK_STATUSES.length)
    assert.isTrue(statuses.some((status) => status.slug === 'todo' && status.is_default))
    assert.isTrue(statuses.some((status) => status.slug === 'done'))
    assert.isAbove(logs.length, 0)
    assert.equal(notifications.unread_count, 1)
    assert.isTrue(
      notifications.notifications.some(
        (notification) =>
          notification.type === 'organization_created' &&
          notification.related_entity_id === organization.id
      )
    )
  })

  test('duplicate names still resolve to unique slugs for separate organizations', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const notification = new NoopNotification()
    const eventPublisher = new NoopOrganizationEventPublisher()

    const first = await createOrganizationAs(user.id, 'Delivery Team', {
      notification,
      eventPublisher,
    })
    const second = await createOrganizationAs(user.id, 'Delivery Team', {
      notification,
      eventPublisher,
    })

    assert.notEqual(first.slug, second.slug)
  })

  test('inactive creators are rejected before organization side effects are written', async ({
    assert,
  }) => {
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const command = new CreateOrganizationCommand(
      makeSystemOrganizationActionContext(inactiveUser.id),
      notificationPublicApi,
      organizationUserReaderWriter,
      organizationTaskWorkflowInitializer,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await assert.rejects(() => command.execute(new CreateOrganizationDTO('Blocked Org')))

    const organizations = await Organization.query().where('owner_id', inactiveUser.id)
    const notifications = await makeGetUserNotifications(
      makeSystemOrganizationActionContext(inactiveUser.id)
    ).handle({
      page: 1,
      limit: 10,
    })

    assert.lengthOf(organizations, 0)
    assert.equal(notifications.meta.total, 0)
  })

  test('required notification staging failure rolls back organization creation atomically', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const notification = new FailingNotification()
    const command = new CreateOrganizationCommand(
      makeSystemOrganizationActionContext(user.id),
      notification,
      organizationUserReaderWriter,
      organizationTaskWorkflowInitializer,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository,
      organizationEventPublisher
    )

    await assert.rejects(
      () => command.execute(new CreateOrganizationDTO('Atomic Org')),
      'notification staging failed'
    )

    const organizations = await Organization.query()
      .where('owner_id', user.id)
      .where('name', 'Atomic Org')
    const refreshedUser = await User.findOrFail(user.id)
    const notifications = await makeGetUserNotifications(
      makeSystemOrganizationActionContext(user.id)
    ).handle({
      page: 1,
      limit: 10,
    })
    const logs = await AuditLog.query().where('entity_type', 'organization')

    assert.equal(notification.stageCalls, 1)
    assert.lengthOf(organizations, 0)
    assert.isNull(refreshedUser.current_organization_id)
    assert.lengthOf(logs, 0)
    assert.equal(notifications.meta.total, 0)
  })
})
