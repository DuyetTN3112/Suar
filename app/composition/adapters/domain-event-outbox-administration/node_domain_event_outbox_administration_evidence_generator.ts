import { createHash, randomUUID } from 'node:crypto'

import { DomainEventOutboxAdministrationEvidenceGenerator } from '#modules/events/actions/ports/outbound/domain-event-outbox-administration/domain_event_outbox_administration_ports'

export class NodeDomainEventOutboxAdministrationEvidenceGenerator
  extends DomainEventOutboxAdministrationEvidenceGenerator
{
  newOperationId(): string {
    return randomUUID()
  }

  digest(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}

