import { makeSystemAuthActionContext } from '#modules/auth/actions/auth_action_context'
import { BaseCommand } from '#modules/auth/actions/base_command'
import type {
  AuthSessionAuditEvidenceWriter,
  AuthSessionEventReceiptStore,
  AuthSessionEvidenceTransactionRunner,
} from '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
import {
  buildAuthSessionEvidence,
  type AuthSessionObservation,
} from '#modules/auth/domain/session-management/auth_session_observation'

export interface ProcessAuthSessionObservedDependencies {
  transactions: AuthSessionEvidenceTransactionRunner
  receipts: AuthSessionEventReceiptStore
  audit: AuthSessionAuditEvidenceWriter
}

export interface ProcessAuthSessionObservedCommandInput {
  readonly observation: AuthSessionObservation
  readonly signal?: AbortSignal
}

export default class ProcessAuthSessionObservedCommand extends BaseCommand<
  ProcessAuthSessionObservedCommandInput,
  void
> {
  constructor(private readonly dependencies: ProcessAuthSessionObservedDependencies) {
    super(makeSystemAuthActionContext('system'))
  }

  override async handle({ observation, signal }: ProcessAuthSessionObservedCommandInput): Promise<void> {
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

  /** Backward-compatible adapter for the auth event listener. */
  async execute(observation: AuthSessionObservation, signal?: AbortSignal): Promise<void> {
    return this.handle({ observation, ...(signal ? { signal } : {}) })
  }
}
