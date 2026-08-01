import db from '@adonisjs/lucid/services/db'

import type {
  AuthSessionEvidenceTransaction,
  AuthSessionEvidenceTransactionRunner,
} from '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'

export class LucidAuthSessionEvidenceTransactionRunner implements AuthSessionEvidenceTransactionRunner {
  run<T>(callback: (trx: AuthSessionEvidenceTransaction) => Promise<T>): Promise<T> {
    return db.transaction((trx) => callback(trx))
  }
}
