import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { UserStatusName, SystemRoleName } from '#constants/user_constants'
import UserRepository from '#repositories/user_repository'

test.group('Integration | User Profile', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('user has default field values', async ({ assert }) => {
    const user = await UserFactory.create()

    assert.equal(user.status, UserStatusName.ACTIVE)
    assert.equal(user.system_role, SystemRoleName.REGISTERED_USER)
    assert.isFalse(user.is_freelancer)
    assert.equal(user.timezone, 'Asia/Ho_Chi_Minh')
    assert.equal(user.language, 'vi')
  })

  test('freelancer flag can be set', async ({ assert }) => {
    const user = await UserFactory.createFreelancer()

    assert.isTrue(user.is_freelancer)
  })

  test('findActiveOrFail returns active user', async ({ assert }) => {
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })

    const found = await UserRepository.findActiveOrFail(user.id)
    assert.equal(found.id, user.id)
  })

  test('findActiveOrFail throws for inactive user', async ({ assert }) => {
    const user = await UserFactory.create({ status: UserStatusName.INACTIVE })

    try {
      await UserRepository.findActiveOrFail(user.id)
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.exists(error)
    }
  })

  test('findNotDeletedOrFail throws for soft-deleted user', async ({ assert }) => {
    const { DateTime } = await import('luxon')
    const user = await UserFactory.create()

    user.deleted_at = DateTime.now()
    await user.save()

    try {
      await UserRepository.findNotDeletedOrFail(user.id)
      assert.fail('Should have thrown')
    } catch (error: any) {
      assert.exists(error)
    }
  })

  test('getSystemRoleName returns correct role', async ({ assert }) => {
    const user = await UserFactory.create({
      system_role: SystemRoleName.SYSTEM_ADMIN,
    })

    const role = await UserRepository.getSystemRoleName(user.id)
    assert.equal(role, SystemRoleName.SYSTEM_ADMIN)
  })

  test('isSystemAdmin returns true for system_admin and superadmin', async ({ assert }) => {
    const admin = await UserFactory.create({
      system_role: SystemRoleName.SYSTEM_ADMIN,
    })
    const superadmin = await UserFactory.createSuperadmin()
    const regularUser = await UserFactory.create()

    assert.isTrue(await UserRepository.isSystemAdmin(admin.id))
    assert.isTrue(await UserRepository.isSystemAdmin(superadmin.id))
    assert.isFalse(await UserRepository.isSystemAdmin(regularUser.id))
  })

  test('isFreelancer returns correct flag', async ({ assert }) => {
    const freelancer = await UserFactory.createFreelancer()
    const regular = await UserFactory.create()

    assert.isTrue(await UserRepository.isFreelancer(freelancer.id))
    assert.isFalse(await UserRepository.isFreelancer(regular.id))
  })
})
