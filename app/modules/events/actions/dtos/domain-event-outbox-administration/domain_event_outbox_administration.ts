import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { TrustedServicePrincipalIdentity } from '#modules/authorization/public_contracts/trusted_service_principal'
import type { DomainEventOutboxAdminSelector } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_administration'

export interface ReplayDomainEventDeadLettersInput {
  selector: DomainEventOutboxAdminSelector
  reason: string
  confirmation: string
  now?: Date
}

export interface ReplayDomainEventDeadLettersResult {
  affectedCount: number
  matchedCount: number
  deferredCount: number
  hasMoreOrLocked: boolean
  selectionDigest: string
}

export interface DomainEventOutboxAdministrationAuditWriter {
  write: typeof auditPublicApi.write
}

export interface DomainEventOutboxOperatorActionContext extends AuditActionContext {
  readonly userId: string
  readonly operatorIdentity: TrustedServicePrincipalIdentity
}
