import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import AuditLog from '#models/mongo/audit_log'
import TaskStatusModel from '#models/task_status'
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import CreateNotification from '#actions/common/create_notification'
import GetUserNotifications from '#actions/notifications/get_user_notifications'
import User from '#models/user'
import { ExecutionContext } from '#types/execution_context'
import { DEFAULT_TASK_STATUSES } from '#constants/task_constants'

async function createOrganizationAs(userId: string, name: string) {
  const command = new CreateOrganizationCommand(
    ExecutionContext.system(userId),
    new CreateNotification()
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
    const notifications = await new GetUserNotifications(ExecutionContext.system(user.id)).handle({
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

    const first = await createOrganizationAs(user.id, 'Delivery Team')
    const second = await createOrganizationAs(user.id, 'Delivery Team')

    assert.notEqual(first.slug, second.slug)
  })

  test('inactive creators are rejected before organization side effects are written', async ({
    assert,
  }) => {
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const command = new CreateOrganizationCommand(
      ExecutionContext.system(inactiveUser.id),
      new CreateNotification()
    )

    await assert.rejects(() => command.execute(new CreateOrganizationDTO('Blocked Org')))

    const organizations = await Organization.query().where('owner_id', inactiveUser.id)
    const notifications = await new GetUserNotifications(
      ExecutionContext.system(inactiveUser.id)
    ).handle({
      page: 1,
      limit: 10,
    })

    assert.lengthOf(organizations, 0)
    assert.equal(notifications.meta.total, 0)
  })
})
