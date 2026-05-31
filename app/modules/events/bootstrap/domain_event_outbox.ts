import { PostgresDomainEventOutboxAdministrationRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_administration_repository'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_repository'
import { registerDomainEventStager } from '#modules/events/public_contracts/domain_event_outbox'
import { registerDomainEventOutboxStatusReader } from '#modules/events/public_contracts/domain_event_outbox_status'

registerDomainEventStager(new PostgresDomainEventOutboxRepository())
registerDomainEventOutboxStatusReader(new PostgresDomainEventOutboxAdministrationRepository())
