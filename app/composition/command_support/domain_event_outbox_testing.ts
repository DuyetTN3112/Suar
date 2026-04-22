import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/domain-event-outbox-administration/adonis_domain_event_dispatcher'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'

export function makeTestingDomainEventOutboxWorker(workerId: string): DomainEventOutboxWorker {
  return new DomainEventOutboxWorker({
    workerId,
    dispatcher: new AdonisDomainEventDispatcher(),
    batchSize: 20,
    concurrency: 1,
  })
}
