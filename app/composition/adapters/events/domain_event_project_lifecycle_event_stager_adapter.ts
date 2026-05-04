import { buildDomainEventId } from '#modules/events/public_contracts/domain_event_identity'
import {
  stageDomainEvent,
  type StageDomainEventInput,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  ProjectLifecycleEventStager,
  StageProjectLifecycleEventInput,
} from '#modules/projects/actions/ports/outbound/project_lifecycle_event_stager'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'

type DomainEventStage = (
  transaction: object,
  input: StageDomainEventInput
) => Promise<unknown>

export class DomainEventProjectLifecycleEventStagerAdapter
  implements ProjectLifecycleEventStager
{
  constructor(private readonly stageDomain: DomainEventStage = stageDomainEvent) {}

  async stage(
    input: StageProjectLifecycleEventInput,
    transaction: ProjectTransaction
  ): Promise<void> {
    const eventId = buildDomainEventId({
      eventName: 'project:lifecycle:changed:v1',
      aggregateId: input.projectId,
      businessEventId: input.mutationId,
    })
    await this.stageDomain(transaction, {
      eventName: 'project:lifecycle:changed:v1',
      dedupeKey: eventId,
      aggregateType: 'project',
      aggregateId: input.projectId,
      payload: {
        eventId,
        action: input.action,
        projectId: input.projectId,
        organizationId: input.organizationId,
        actorId: input.actorId,
        projectName: input.projectName,
        occurredAt: input.occurredAt,
      },
    })
  }
}
