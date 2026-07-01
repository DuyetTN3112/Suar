import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import type { ProjectContextChangeStager } from '#modules/projects/actions/ports/outbound/project-context/project_context_change_stager'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectContextChangedV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

/**
 * Stages the context-changed fact on the caller's transaction. The dedupe key is
 * derived from the published version identity, so a retried publication cannot
 * emit a second event for the same version.
 */
export class LucidProjectContextChangeStager implements ProjectContextChangeStager {
  async stageProjectContextChanged(
    fact: ProjectContextChangedV1,
    transaction: ProjectTransaction
  ): Promise<void> {
    await stageDomainEvent(lucidTransaction(transaction), {
      eventName: 'project:context:changed:v1',
      dedupeKey: createHash('sha256')
        .update(`project_context:${fact.projectId}:${fact.activeVersionId}`)
        .digest('hex'),
      aggregateType: 'project',
      aggregateId: fact.projectId,
      payload: {
        schemaVersion: fact.schemaVersion,
        projectId: fact.projectId,
        organizationId: fact.organizationId,
        previousVersionId: fact.previousVersionId,
        activeVersionId: fact.activeVersionId,
        activeVersionNumber: fact.activeVersionNumber,
        versionToken: fact.versionToken,
        actorId: fact.actorId,
        occurredAt: fact.occurredAt,
      },
    })
  }
}
