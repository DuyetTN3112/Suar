import type {
  UserApprovedEvent,
  UserDeactivatedEvent,
  UserProfileUpdatedEvent,
  UserRegisteredEvent,
} from '#modules/users/public_contracts/user_events'

export interface UserEventPublisher {
  publishUserRegistered(event: UserRegisteredEvent): Promise<void>
  publishUserApproved(event: UserApprovedEvent): Promise<void>
  publishUserDeactivated(event: UserDeactivatedEvent): Promise<void>
  publishUserProfileUpdated(event: UserProfileUpdatedEvent): Promise<void>
}
