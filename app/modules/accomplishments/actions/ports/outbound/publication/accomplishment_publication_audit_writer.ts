import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'

export interface AccomplishmentPublicationAuditEvent {
  readonly action: 'publish' | 'unpublish'
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly projectionId: string | null
  readonly publicationVersion: number | null
  readonly insertedOrChanged: boolean
  readonly sourceCanonicalHash: string | null
  readonly lifecycleRevisionId: string | null
  readonly disclosurePolicyVersion: string | null
}

export interface AccomplishmentPublicationAuditWriter {
  record(event: AccomplishmentPublicationAuditEvent, execCtx: AuditActionContext): Promise<void>
}
