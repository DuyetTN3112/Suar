import type { UserTransaction } from './user_transaction.js'

export interface StageUserAccountLifecycleEventInput {
  mutationId: string
  action: 'registered' | 'deactivated' | 'deleted' | 'suspended' | 'activated'
  userId: string
  actorId: string
  occurredAt: string
}

export interface StageUserProfileChangedEventInput {
  mutationId: string
  userId: string
  actorId: string
  changedFields: string[]
  occurredAt: string
}

export interface UserLifecycleEventStager {
  stageAccountLifecycle(
    transaction: UserTransaction,
    input: StageUserAccountLifecycleEventInput
  ): Promise<void>
  stageProfileChanged(
    transaction: UserTransaction,
    input: StageUserProfileChangedEventInput
  ): Promise<void>
}
