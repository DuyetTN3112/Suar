import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  DomainEventOutboxAdministrationAuditWriter,
  DomainEventOutboxOperatorActionContext,
} from '#modules/events/actions/dtos/domain_event_outbox_administration'
import {
  digestDomainEventOutboxSelector,
  mapDomainEventOutboxSelectorShape,
  requireDomainEventOutboxOperator,
} from '#modules/events/actions/mappers/domain_event_outbox_administration_audit_mapper'
import type {
  DomainEventOutboxAdministrationEvidenceGenerator,
  DomainEventOutboxAdministrationRepository,
} from '#modules/events/actions/ports/outbound/domain_event_outbox_administration_ports'
import {
  type DomainEventOutboxDeadLetterPreviewInput,
  type DomainEventOutboxDeadLetterPreviewPage,
  validateDomainEventOutboxPreviewInput,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_administration'

export interface PreviewDomainEventDeadLettersDependencies {
  auditWriter?: DomainEventOutboxAdministrationAuditWriter
  evidenceGenerator: DomainEventOutboxAdministrationEvidenceGenerator
}

export class PreviewDomainEventDeadLettersQuery {
  private readonly auditWriter: DomainEventOutboxAdministrationAuditWriter

  constructor(
    private readonly repository: DomainEventOutboxAdministrationRepository,
    private readonly dependencies: PreviewDomainEventDeadLettersDependencies
  ) {
    this.auditWriter = dependencies.auditWriter ?? auditPublicApi
  }

  async execute(
    unsafeInput: DomainEventOutboxDeadLetterPreviewInput,
    execCtx: DomainEventOutboxOperatorActionContext
  ): Promise<DomainEventOutboxDeadLetterPreviewPage> {
    const operatorIdentity = requireDomainEventOutboxOperator(execCtx)
    const actorId = operatorIdentity.actorId
    const input = validateDomainEventOutboxPreviewInput(unsafeInput)
    const page = await this.repository.previewDeadLetters(input)
    const operationId = this.dependencies.evidenceGenerator.newOperationId()

    await this.auditWriter.write(execCtx, {
      action: 'domain_event_outbox.dlq_previewed',
      event_name: 'domain_event.outbox.dlq_previewed',
      event_family: 'domain_event_operations',
      module: 'events',
      subsystem: 'domain_event_outbox',
      workflow: 'domain_event_outbox_dlq_administration',
      stage: 'previewed',
      severity: 'info',
      outcome: 'success',
      actor_type: operatorIdentity.actorType,
      entity_type: 'domain_event_outbox_preview',
      entity_id: operationId,
      target_type: 'domain_event_outbox_dlq',
      target_id: operationId,
      retention_class: 'security',
      redaction_applied: true,
      critical: true,
      new_values: {
        actorId,
        authenticationProvenance: operatorIdentity.authenticationProvenance,
        principalConfigurationKey: operatorIdentity.configurationKey,
        selectorShape: mapDomainEventOutboxSelectorShape(input.selector),
        selectorDigest: digestDomainEventOutboxSelector(
          input.selector,
          this.dependencies.evidenceGenerator
        ),
        limit: input.limit,
        afterSequencePresent: input.afterSequence !== undefined,
        returnedCount: page.items.length,
        hasMore: page.hasMore,
      },
    })

    return page
  }
}

