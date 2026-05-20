import {
  requireTrustedServicePrincipalIdentity,
  type TrustedServicePrincipalIdentity,
} from '#modules/authorization/public_contracts/trusted_service_principal'
import type { DomainEventOutboxOperatorActionContext } from '#modules/events/actions/dtos/domain-event-outbox-administration/domain_event_outbox_administration'
import type { DomainEventOutboxAdministrationEvidenceGenerator } from '#modules/events/actions/ports/outbound/domain-event-outbox-administration/domain_event_outbox_administration_ports'
import type {
  DomainEventOutboxAdminSelector,
  DomainEventOutboxReplayRow,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_administration'

export function requireDomainEventOutboxOperator(
  execCtx: DomainEventOutboxOperatorActionContext
): TrustedServicePrincipalIdentity {
  return requireTrustedServicePrincipalIdentity(execCtx.operatorIdentity, execCtx.userId)
}

export function digestDomainEventOutboxSelector(
  selector: DomainEventOutboxAdminSelector,
  evidenceGenerator: DomainEventOutboxAdministrationEvidenceGenerator
): string {
  return evidenceGenerator.digest(
    JSON.stringify({
      id: selector.id ?? null,
      eventName: selector.eventName ?? null,
      dedupeKey: selector.dedupeKey ?? null,
    })
  )
}

export function digestDomainEventOutboxSelection(
  rows: DomainEventOutboxReplayRow[],
  evidenceGenerator: DomainEventOutboxAdministrationEvidenceGenerator
): string {
  return evidenceGenerator.digest(
    rows
      .map((row) => row.id)
      .sort()
      .join(':')
  )
}

export function mapDomainEventOutboxSelectorShape(
  selector: DomainEventOutboxAdminSelector
): Record<string, boolean> {
  return {
    exactId: selector.id !== undefined,
    exactEventName: selector.eventName !== undefined,
    exactDedupeKey: selector.dedupeKey !== undefined,
  }
}
