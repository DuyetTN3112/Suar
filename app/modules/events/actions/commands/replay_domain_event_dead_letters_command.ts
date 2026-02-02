import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  DomainEventOutboxAdministrationAuditWriter,
  DomainEventOutboxOperatorActionContext,
  ReplayDomainEventDeadLettersInput,
  ReplayDomainEventDeadLettersResult,
} from '#modules/events/actions/dtos/domain_event_outbox_administration'
import {
  digestDomainEventOutboxSelection,
  digestDomainEventOutboxSelector,
  mapDomainEventOutboxSelectorShape,
  requireDomainEventOutboxOperator,
} from '#modules/events/actions/mappers/domain_event_outbox_administration_audit_mapper'
import type {
  DomainEventOutboxAdministrationEvidenceGenerator,
  DomainEventOutboxAdministrationRepository,
  DomainEventOutboxAdministrationTransactionExecutor,
} from '#modules/events/actions/ports/outbound/domain_event_outbox_administration_ports'
import { requireDomainEventOutboxReplayRequest } from '#modules/events/domain/domain_event_outbox_administration'

export interface ReplayDomainEventDeadLettersDependencies {
  auditWriter?: DomainEventOutboxAdministrationAuditWriter
  transactionExecutor: DomainEventOutboxAdministrationTransactionExecutor
  evidenceGenerator: DomainEventOutboxAdministrationEvidenceGenerator
}

export class ReplayDomainEventDeadLettersCommand {
  private readonly auditWriter: DomainEventOutboxAdministrationAuditWriter

  constructor(
    private readonly repository: DomainEventOutboxAdministrationRepository,
    private readonly dependencies: ReplayDomainEventDeadLettersDependencies
  ) {
    this.auditWriter = dependencies.auditWriter ?? auditPublicApi
  }

  async execute(
    unsafeInput: ReplayDomainEventDeadLettersInput,
    execCtx: DomainEventOutboxOperatorActionContext
  ): Promise<ReplayDomainEventDeadLettersResult> {
    const operatorIdentity = requireDomainEventOutboxOperator(execCtx)
    const actorId = operatorIdentity.actorId
    const { selector, reason, now } = requireDomainEventOutboxReplayRequest({
      selector: unsafeInput.selector,
      reason: unsafeInput.reason,
      confirmation: unsafeInput.confirmation,
      now: unsafeInput.now ?? new Date(),
    })
    const reasonDigest = this.dependencies.evidenceGenerator.digest(reason)

    return this.dependencies.transactionExecutor.run(async (trx) => {
      const batch = await this.repository.replayDeadLetters(
        {
          selector,
          actorId,
          reasonDigest,
          reasonLength: reason.length,
          now,
        },
        trx
      )
      const replayed = batch.rows
      const replayedSelectionDigest = digestDomainEventOutboxSelection(
        replayed,
        this.dependencies.evidenceGenerator
      )
      const operationId = this.dependencies.evidenceGenerator.newOperationId()

      await this.auditWriter.write(
        execCtx,
        {
          action: 'domain_event_outbox.replayed',
          event_name: 'domain_event.outbox.replayed',
          event_family: 'domain_event_operations',
          module: 'events',
          subsystem: 'domain_event_outbox',
          workflow: 'domain_event_outbox_dlq_administration',
          stage: 'completed',
          severity: replayed.length === 0 && !batch.hasMoreOrLocked ? 'info' : 'warning',
          outcome: batch.hasMoreOrLocked ? 'warning' : 'success',
          actor_type: operatorIdentity.actorType,
          entity_type: 'domain_event_outbox_replay',
          entity_id: operationId,
          target_type: 'domain_event_outbox_selection',
          target_id: operationId,
          retention_class: 'security',
          redaction_applied: true,
          critical: true,
          new_values: {
            actorId,
            authenticationProvenance: operatorIdentity.authenticationProvenance,
            principalConfigurationKey: operatorIdentity.configurationKey,
            selectorShape: mapDomainEventOutboxSelectorShape(selector),
            selectorDigest: digestDomainEventOutboxSelector(
              selector,
              this.dependencies.evidenceGenerator
            ),
            reasonDigest,
            reasonLength: reason.length,
            affectedCount: replayed.length,
            matchedCount: batch.matchedCount,
            deferredCount: batch.deferredCount,
            hasMoreOrLocked: batch.hasMoreOrLocked,
            selectionDigest: replayedSelectionDigest,
            previousAttemptCountTotal: replayed.reduce(
              (total, row) => total + row.previousAttemptCount,
              0
            ),
            lifetimeAttemptCountTotal: replayed.reduce(
              (total, row) => total + row.lifetimeAttemptCount,
              0
            ),
          },
        },
        trx
      )

      return {
        affectedCount: replayed.length,
        matchedCount: batch.matchedCount,
        deferredCount: batch.deferredCount,
        hasMoreOrLocked: batch.hasMoreOrLocked,
        selectionDigest: replayedSelectionDigest,
      }
    })
  }
}
