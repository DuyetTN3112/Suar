import { createHash } from 'node:crypto'

import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { stageDomainEvent } from '#modules/events/public_contracts/domain_event_outbox'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { WorkPackageChangeStager } from '#modules/projects/actions/ports/outbound/work_package_change_stager'
import type { WorkPackageChangedV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

/** Mirrors the Project Context stager so both facts share one delivery path. */
export class LucidWorkPackageChangeStager implements WorkPackageChangeStager {
  async stageWorkPackageChanged(
    fact: WorkPackageChangedV1,
    transaction: ProjectTransaction
  ): Promise<void> {
    await stageDomainEvent(lucidTransaction(transaction), {
      eventName: 'project:work-package:changed:v1',
      dedupeKey: createHash('sha256')
        .update(`work_package:${fact.workPackageId}:${fact.activeVersionId}`)
        .digest('hex'),
      aggregateType: 'project',
      aggregateId: fact.projectId,
      payload: {
        schemaVersion: fact.schemaVersion,
        projectId: fact.projectId,
        organizationId: fact.organizationId,
        workPackageId: fact.workPackageId,
        activeVersionId: fact.activeVersionId,
        activeVersionNumber: fact.activeVersionNumber,
        versionToken: fact.versionToken,
        actorId: fact.actorId,
        occurredAt: fact.occurredAt,
      },
    })
  }
}
