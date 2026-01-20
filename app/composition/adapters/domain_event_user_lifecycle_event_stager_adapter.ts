import { buildDomainEventId } from '#modules/events/public_contracts/domain_event_identity'
import {
  stageDomainEvent,
  type StageDomainEventInput,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  StageUserAccountLifecycleEventInput,
  StageUserProfileChangedEventInput,
  UserLifecycleEventStager,
} from '#modules/users/actions/ports/outbound/user_lifecycle_event_stager'
import type { UserTransaction } from '#modules/users/actions/ports/outbound/user_transaction'

type DomainEventStage = (
  transaction: object,
  input: StageDomainEventInput
) => Promise<unknown>

export class DomainEventUserLifecycleEventStagerAdapter
  implements UserLifecycleEventStager
{
  constructor(private readonly stageDomain: DomainEventStage = stageDomainEvent) {}

  async stageAccountLifecycle(
    transaction: UserTransaction,
    input: StageUserAccountLifecycleEventInput
  ): Promise<void> {
    const eventId = buildDomainEventId({
      eventName: 'user:account:lifecycle:changed:v1',
      aggregateId: input.userId,
      businessEventId: input.mutationId,
    })
    await this.stageDomain(transaction, {
      eventName: 'user:account:lifecycle:changed:v1',
      dedupeKey: eventId,
      aggregateType: 'user',
      aggregateId: input.userId,
      payload: {
        eventId,
        action: input.action,
        userId: input.userId,
        actorId: input.actorId,
        occurredAt: input.occurredAt,
      },
    })
  }

  async stageProfileChanged(
    transaction: UserTransaction,
    input: StageUserProfileChangedEventInput
  ): Promise<void> {
    const eventId = buildDomainEventId({
      eventName: 'user:profile:changed:v1',
      aggregateId: input.userId,
      businessEventId: input.mutationId,
    })
    await this.stageDomain(transaction, {
      eventName: 'user:profile:changed:v1',
      dedupeKey: eventId,
      aggregateType: 'user',
      aggregateId: input.userId,
      payload: {
        eventId,
        userId: input.userId,
        actorId: input.actorId,
        changedFields: [...new Set(input.changedFields)].sort((left, right) =>
          left.localeCompare(right)
        ),
        occurredAt: input.occurredAt,
      },
    })
  }
}
