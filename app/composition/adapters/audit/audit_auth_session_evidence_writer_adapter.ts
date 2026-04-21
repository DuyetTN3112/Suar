import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  AuthSessionAuditEvidence,
  AuthSessionAuditEvidenceWriter,
  AuthSessionEvidenceTransaction,
} from '#modules/auth/actions/ports/outbound/auth_session_evidence_persistence'
import type { AuthSessionObservation } from '#modules/auth/domain/session-management/auth_session_observation'

export class AuditAuthSessionEvidenceWriterAdapter implements AuthSessionAuditEvidenceWriter {
  async write(
    observation: AuthSessionObservation,
    evidence: AuthSessionAuditEvidence,
    trx: AuthSessionEvidenceTransaction
  ): Promise<void> {
    await auditPublicApi.write(
      {
        userId: observation.userId,
        ip: observation.ipAddress,
        userAgent: observation.userAgent,
        organizationId: null,
        requestId: observation.requestId,
        traceId: observation.traceId,
        workflowId: null,
      },
      {
        ...evidence,
        source_occurred_at: new Date(evidence.source_occurred_at),
      },
      trx
    )
  }
}
