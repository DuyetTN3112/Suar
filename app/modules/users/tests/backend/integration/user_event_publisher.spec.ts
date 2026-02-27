import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeDeactivateUserCommand,
  userAccountActionFactory,
} from '#composition/user_action_factory'
import { userExternalDependencies } from '#composition/user_external_dependencies_composition'
import { userTransactionRunner } from '#composition/user_persistence_composition'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import * as membershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import ApproveUserCommand from '#modules/users/actions/commands/approve_user_command'
import { ApproveUserDTO } from '#modules/users/actions/dtos/request/approve_user_dto'
import { RegisterUserDTO } from '#modules/users/actions/dtos/request/register_user_dto'
import { UpdateUserDetailsDTO } from '#modules/users/actions/dtos/request/update_user_details_dto'
import type { UserEventPublisher } from '#modules/users/actions/ports/outbound/user_event_publisher'
import type { UserNotificationStager as NotificationStager } from '#modules/users/actions/ports/outbound/user_notification_stager'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import User from '#modules/users/infra/models/user'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  UserFactory,
} from '#tests/helpers/factories'

class UserEventPublisherSpy implements UserEventPublisher {
  public registeredEvents: Array<{ userId: string }> = []
  public approvedEvents: Array<{ userId: string; approvedBy: string; organizationId: string }> = []
  public deactivatedEvents: Array<{ userId: string; deactivatedBy: string; reason?: string }> = []
  public profileUpdatedEvents: Array<{ userId: string; changes: Record<string, unknown> }> = []

  publishUserRegistered(event: { userId: string }): Promise<void> {
    this.registeredEvents.push(event)
    return Promise.resolve()
  }

  publishUserApproved(event: {
    userId: string
    approvedBy: string
    organizationId: string
  }): Promise<void> {
    this.approvedEvents.push(event)
    return Promise.resolve()
  }

  publishUserDeactivated(event: {
    userId: string
    deactivatedBy: string
    reason?: string
  }): Promise<void> {
    this.deactivatedEvents.push(event)
    return Promise.resolve()
  }

  publishUserProfileUpdated(event: {
    userId: string
    changes: Record<string, unknown>
  }): Promise<void> {
    this.profileUpdatedEvents.push(event)
    return Promise.resolve()
  }
}

class NotificationSpy implements NotificationStager {
  public stageCalls: Array<Parameters<NotificationStager['stage']>[0]> = []

  stage(command: Parameters<NotificationStager['stage']>[0]): Promise<void> {
    this.stageCalls.push(command)
    return Promise.resolve()
  }
}

class FailingNotificationStager implements NotificationStager {
  public stage(): Promise<never> {
    return Promise.reject(new Error('mandatory notification staging failed'))
  }
}

async function findUserOutboxEvent(eventName: string, userId: string) {
  const row: unknown = await db
    .from('domain_event_outbox')
    .where('event_name', eventName)
    .where('aggregate_id', userId)
    .first()
  return row as Record<string, unknown> | null
}

test.group('Integration | User Event Publisher Boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('register user stages the durable account lifecycle event', async ({ assert }) => {
    const actor = await UserFactory.create()
    const command = userAccountActionFactory.makeRegister(
      makeSystemUserActionContext(actor.id)
    )

    const user = await command.handle(
      new RegisterUserDTO(
        `user_${Date.now()}`,
        `user_${Date.now()}@example.com`,
        SystemRoleName.REGISTERED_USER,
        UserStatusName.ACTIVE
      )
    )

    assert.isNotNull(
      await findUserOutboxEvent('user:account:lifecycle:changed:v1', user.id)
    )
  })

  test('approve user publishes user-approved through user event publisher', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const user = await UserFactory.create()
    const userEventPublisherSpy = new UserEventPublisherSpy()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: user.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
    })

    const command = new ApproveUserCommand(
      makeSystemUserActionContext(owner.id),
      userTransactionRunner,
      userExternalDependencies.organizationMembership,
      userExternalDependencies.permission,
      userEventPublisherSpy
    )

    await command.handle(new ApproveUserDTO(user.id, org.id, owner.id))

    assert.lengthOf(userEventPublisherSpy.approvedEvents, 1)
    assert.deepEqual(userEventPublisherSpy.approvedEvents[0], {
      userId: user.id,
      approvedBy: owner.id,
      organizationId: org.id,
    })
  })

  test('deactivate user stages lifecycle and notification atomically', async ({ assert }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })
    const notificationSpy = new NotificationSpy()
    const command = makeDeactivateUserCommand(
      makeSystemUserActionContext(superadmin.id),
      notificationSpy
    )

    await command.execute({
      user_id: user.id,
      reason: 'Compliance review',
    })

    const persistedUser = await User.findOrFail(user.id)
    assert.equal(persistedUser.status, UserStatusName.INACTIVE)
    assert.isNotNull(
      await findUserOutboxEvent('user:account:lifecycle:changed:v1', user.id)
    )
    assert.lengthOf(notificationSpy.stageCalls, 1)
  })

  test('mandatory notification staging failure rolls back user deactivation', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })
    const command = makeDeactivateUserCommand(
      makeSystemUserActionContext(superadmin.id),
      new FailingNotificationStager()
    )

    await assert.rejects(
      () =>
        command.execute({
          user_id: user.id,
          reason: 'Compliance review',
        }),
      'mandatory notification staging failed'
    )

    const persistedUser = await User.findOrFail(user.id)
    assert.equal(persistedUser.status, UserStatusName.ACTIVE)
    assert.isNull(
      await findUserOutboxEvent('user:account:lifecycle:changed:v1', user.id)
    )
  })

  test('update user profile stages a durable profile-changed event', async ({ assert }) => {
    const user = await UserFactory.create()
    const command = userAccountActionFactory.makeUpdateProfile(
      makeSystemUserActionContext(user.id)
    )

    await command.handle(
      new UpdateUserProfileDTO(
        user.id,
        'updated-profile-user',
        'updated-profile@example.com'
      )
    )

    assert.isNotNull(
      await findUserOutboxEvent('user:profile:changed:v1', user.id)
    )
  })

  test('update user details stages a durable profile-changed event', async ({ assert }) => {
    const user = await UserFactory.create()
    const command = userAccountActionFactory.makeUpdateDetails(
      makeSystemUserActionContext(user.id)
    )

    await command.handle(
      new UpdateUserDetailsDTO({
        bio: 'Search-friendly profile summary',
        timezone: 'UTC',
        language: 'en',
        is_external_contributor: true,
      })
    )

    assert.isNotNull(
      await findUserOutboxEvent('user:profile:changed:v1', user.id)
    )
  })
})
