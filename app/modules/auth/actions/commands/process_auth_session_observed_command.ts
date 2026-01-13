import type {
  AuthSessionAuditEvidenceWriter,
  AuthSessionEventReceiptStore,
  AuthSessionEvidenceTransactionRunner,
} from '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
import {
  buildAuthSessionEvidence,
  type AuthSessionObservation,
} from '#modules/auth/domain/auth_session_observation'

export interface ProcessAuthSessionObservedDependencies {
  transactions: AuthSessionEvidenceTransactionRunner
  receipts: AuthSessionEventReceiptStore
  audit: AuthSessionAuditEvidenceWriter
}

export default class ProcessAuthSessionObservedCommand {
  constructor(private readonly dependencies: ProcessAuthSessionObservedDependencies) {}

  async execute(observation: AuthSessionObservation, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()
    await this.dependencies.transactions.run(async (trx) => {
      signal?.throwIfAborted()
      const claimed = await this.dependencies.receipts.claim(trx, observation)
      if (!claimed) return

      const evidence = buildAuthSessionEvidence(observation)
      await this.dependencies.audit.write(observation, evidence.audit, trx)
      signal?.throwIfAborted()
    })
  }
}
