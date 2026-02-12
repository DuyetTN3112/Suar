import type {
  AuthSessionObservation,
  buildAuthSessionEvidence,
} from '#modules/auth/domain/auth_session_observation'

type AuthSessionEvidence = ReturnType<typeof buildAuthSessionEvidence>

export type AuthSessionEvidenceTransaction = object
export type AuthSessionAuditEvidence = AuthSessionEvidence['audit']

export interface AuthSessionEvidenceTransactionRunner {
  run<T>(callback: (trx: AuthSessionEvidenceTransaction) => Promise<T>): Promise<T>
}

export interface AuthSessionEventReceiptStore {
  claim(trx: AuthSessionEvidenceTransaction, observation: AuthSessionObservation): Promise<boolean>
}

export interface AuthSessionAuditEvidenceWriter {
  write(
    observation: AuthSessionObservation,
    evidence: AuthSessionAuditEvidence,
    trx: AuthSessionEvidenceTransaction
  ): Promise<void>
}
