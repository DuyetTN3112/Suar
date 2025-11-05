import { test } from '@japa/runner'

import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import ApproveUserCommand from '#modules/users/actions/commands/approve_user_command'
import DeactivateUserCommand from '#modules/users/actions/commands/deactivate_user_command'
import RegisterUserCommand from '#modules/users/actions/commands/register_user_command'
import UpdateUserDetailsCommand from '#modules/users/actions/commands/update_user_details_command'
import UpdateUserProfileCommand from '#modules/users/actions/commands/update_user_profile_command'
import { ApproveUserDTO } from '#modules/users/actions/dtos/request/approve_user_dto'
import { RegisterUserDTO } from '#modules/users/actions/dtos/request/register_user_dto'
import { UpdateUserDetailsDTO } from '#modules/users/actions/dtos/request/update_user_details_dto'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import type { UserEventPublisher } from '#modules/users/application/ports/user_event_publisher'
import { SystemRoleName, UserStatusName } from '#modules/users/constants/user_constants'
import User from '#modules/users/infra/models/user'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  UserFactory,
} from '#tests/helpers/factories'

type NotificationPayload = Parameters<NotificationCreator['handle']>[0]

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

class NotificationSpy implements NotificationCreator {
  public calls: NotificationPayload[] = []

  handle(data: NotificationPayload): Promise<null> {
    this.calls.push(data)
    return Promise.resolve(null)
  }
}

test.group('Integration | User Event Publisher Boundary', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('register user publishes user-registered through user event publisher', async ({ assert }) => {
    const actor = await UserFactory.create()
    const userEventPublisherSpy = new UserEventPublisherSpy()
    const command = new RegisterUserCommand(
      makeSystemUserActionContext(actor.id),
      userEventPublisherSpy
    )

    const user = await command.handle(
      new RegisterUserDTO(
        `user_${Date.now()}`,
        `user_${Date.now()}@example.com`,
        SystemRoleName.REGISTERED_USER,
        UserStatusName.ACTIVE
      )
    )

    assert.lengthOf(userEventPublisherSpy.registeredEvents, 1)
    assert.deepEqual(userEventPublisherSpy.registeredEvents[0], {
      userId: user.id,
    })
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

  test('deactivate user publishes user-deactivated through user event publisher', async ({ assert }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })
    const userEventPublisherSpy = new UserEventPublisherSpy()
    const notificationSpy = new NotificationSpy()
    const command = new DeactivateUserCommand(
      makeSystemUserActionContext(superadmin.id),
      notificationSpy,
      userEventPublisherSpy
    )

    await command.execute({
      user_id: user.id,
      reason: 'Compliance review',
    })

    const persistedUser = await User.findOrFail(user.id)
    assert.equal(persistedUser.status, UserStatusName.INACTIVE)
    assert.lengthOf(userEventPublisherSpy.deactivatedEvents, 1)
    assert.deepEqual(userEventPublisherSpy.deactivatedEvents[0], {
      userId: user.id,
      deactivatedBy: superadmin.id,
      reason: 'Compliance review',
    })
  })

  test('update user profile publishes profile-updated through user event publisher', async ({ assert }) => {
    const user = await UserFactory.create()
    const userEventPublisherSpy = new UserEventPublisherSpy()
    const command = new UpdateUserProfileCommand(
      makeSystemUserActionContext(user.id),
      userEventPublisherSpy
    )

    await command.handle(
      new UpdateUserProfileDTO(
        user.id,
        'updated-profile-user',
        'updated-profile@example.com'
      )
    )

    assert.lengthOf(userEventPublisherSpy.profileUpdatedEvents, 1)
    assert.deepEqual(userEventPublisherSpy.profileUpdatedEvents[0], {
      userId: user.id,
      changes: {
        username: 'updated-profile-user',
        email: 'updated-profile@example.com',
      },
    })
  })

  test('update user details publishes profile-updated through user event publisher', async ({ assert }) => {
    const user = await UserFactory.create()
    const userEventPublisherSpy = new UserEventPublisherSpy()
    const command = new UpdateUserDetailsCommand(
      makeSystemUserActionContext(user.id),
      userEventPublisherSpy
    )

    await command.handle(
      new UpdateUserDetailsDTO({
        bio: 'Search-friendly profile summary',
        timezone: 'UTC',
        language: 'en',
        is_external_contributor: true,
      })
    )

    assert.lengthOf(userEventPublisherSpy.profileUpdatedEvents, 1)
    assert.deepEqual(userEventPublisherSpy.profileUpdatedEvents[0], {
      userId: user.id,
      changes: {
        avatar_url: undefined,
        bio: 'Search-friendly profile summary',
        phone: undefined,
        address: undefined,
        timezone: 'UTC',
        language: 'en',
        is_external_contributor: true,
      },
    })
  })
})
