import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, OrganizationFactory, cleanupTestData } from '#tests/helpers/factories'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import AuditLog from '#models/mongo/audit_log'
import CreateOrganizationCommand from '#actions/organizations/commands/create_organization_command'
import { CreateOrganizationDTO } from '#actions/organizations/dtos/request/create_organization_dto'
import CreateNotification from '#actions/common/create_notification'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Create Organization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('creates org successfully', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('Test Organization')
    const org = await command.execute(dto)

    assert.isNotNull(org)
    assert.equal(org.name, 'Test Organization')
    assert.equal(org.owner_id, user.id)
  })

  test('auto-creates owner membership', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('Owner Membership Org')
    const org = await command.execute(dto)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', user.id)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership!.org_role, 'org_owner')
    assert.equal(membership!.status, 'approved')
  })

  test('slug auto-generated from name', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('My Awesome Team')
    const org = await command.execute(dto)

    assert.isNotNull(org.slug)
    assert.isTrue(org.slug.length > 0)
  })

  test('user current_org_id set after creation', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('Set Org Test')
    const org = await command.execute(dto)

    const { default: User } = await import('#models/user')
    const updatedUser = await User.findOrFail(user.id)
    assert.equal(updatedUser.current_organization_id, org.id)
  })

  test('duplicate slug handled', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto1 = new CreateOrganizationDTO('Unique Org Name')
    const org1 = await command.execute(dto1)

    const dto2 = new CreateOrganizationDTO('Unique Org Name')
    const org2 = await command.execute(dto2)

    assert.notEqual(org1.slug, org2.slug)
  })

  test('custom_roles defaults to empty', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const result = await Organization.findOrFail(org.id)
    assert.isTrue(result.custom_roles === null || Array.isArray(result.custom_roles))
  })

  test('audit log created on org creation', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('Audited Org')
    const org = await command.execute(dto)

    const logs = await AuditLog.query()
      .where('entity_type', 'organization')
      .where('entity_id', org.id)
    assert.isAbove(logs.length, 0)
  })

  test('plan defaults to free', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = ExecutionContext.system(user.id)
    const command = new CreateOrganizationCommand(ctx, new CreateNotification())

    const dto = new CreateOrganizationDTO('Free Plan Org')
    const org = await command.execute(dto)

    assert.equal(org.plan, 'free')
  })
})
