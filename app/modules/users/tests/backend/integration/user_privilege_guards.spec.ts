import { test } from '@japa/runner'

import { userAccountActionFactory } from '#composition/user_action_factory'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { RegisterUserDTO } from '#modules/users/actions/dtos/request/register_user_dto'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import User from '#modules/users/infra/models/user'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | User privilege guards', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('non-superadmin cannot register a privileged account', async ({ assert }) => {
    const actor = await UserFactory.create({ system_role: SystemRoleName.REGISTERED_USER })
    const email = `forbidden-grant-${Date.now()}@example.test`
    const command = userAccountActionFactory.makeRegister(
      makeSystemUserActionContext(actor.id)
    )

    await assert.rejects(
      () =>
        command.handle(
          new RegisterUserDTO(
            'forbidden-grant-user',
            email,
            SystemRoleName.SUPERADMIN,
            UserStatusName.ACTIVE
          )
        ),
      ForbiddenException
    )

    assert.isNull(await User.findBy('email', email))
  })

  test('registration defaults an empty role to registered_user', async ({ assert }) => {
    const actor = await UserFactory.createSuperadmin()
    const command = userAccountActionFactory.makeRegister(
      makeSystemUserActionContext(actor.id)
    )

    const created = await command.handle(
      new RegisterUserDTO(
        `default-role-${Date.now()}`,
        `default-role-${Date.now()}@example.test`,
        '   ',
        UserStatusName.ACTIVE
      )
    )

    assert.equal(created.system_role, SystemRoleName.REGISTERED_USER)
  })

  test('superadmin can register an explicitly privileged account', async ({ assert }) => {
    const actor = await UserFactory.createSuperadmin()
    const command = userAccountActionFactory.makeRegister(
      makeSystemUserActionContext(actor.id)
    )

    const created = await command.handle(
      new RegisterUserDTO(
        `admin-grant-${Date.now()}`,
        `admin-grant-${Date.now()}@example.test`,
        SystemRoleName.SYSTEM_ADMIN,
        UserStatusName.ACTIVE
      )
    )

    assert.equal(created.system_role, SystemRoleName.SYSTEM_ADMIN)
  })

  test('ordinary user cannot update another profile and leaves it unchanged', async ({
    assert,
  }) => {
    const actor = await UserFactory.create({ system_role: SystemRoleName.REGISTERED_USER })
    const target = await UserFactory.create({
      username: 'profile-owner-before',
      email: 'profile-owner-before@example.test',
    })
    const command = userAccountActionFactory.makeUpdateProfile(
      makeSystemUserActionContext(actor.id)
    )

    await assert.rejects(
      () =>
        command.handle(
          new UpdateUserProfileDTO(
            target.id,
            'profile-owner-after',
            'profile-owner-after@example.test'
          )
        ),
      ForbiddenException
    )

    await target.refresh()
    assert.equal(target.username, 'profile-owner-before')
    assert.equal(target.email, 'profile-owner-before@example.test')
  })

  test('self and system administrators retain legitimate profile updates', async ({ assert }) => {
    const owner = await UserFactory.create({ username: 'self-before' })
    await userAccountActionFactory
      .makeUpdateProfile(makeSystemUserActionContext(owner.id))
      .handle(new UpdateUserProfileDTO(owner.id, 'self-after', undefined))
    await owner.refresh()
    assert.equal(owner.username, 'self-after')

    const admin = await UserFactory.create({ system_role: SystemRoleName.SYSTEM_ADMIN })
    await userAccountActionFactory
      .makeUpdateProfile(makeSystemUserActionContext(admin.id))
      .handle(new UpdateUserProfileDTO(owner.id, 'admin-updated-profile', undefined))
    await owner.refresh()
    assert.equal(owner.username, 'admin-updated-profile')
  })
})
