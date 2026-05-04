import type {
  AccomplishmentPublicationAuditEvent,
  AccomplishmentPublicationAuditWriter,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_audit_writer'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'

export default class AccomplishmentPublicationAuditWriterAdapter
  implements AccomplishmentPublicationAuditWriter
{
  async record(event: AccomplishmentPublicationAuditEvent, execCtx: AuditActionContext) {
    if (!execCtx.userId) return

    await auditPublicApi.write(execCtx, {
      user_id: execCtx.userId,
      action: `accomplishment_${event.action}`,
      entity_type: 'accomplishment_publication',
      entity_id: event.accomplishmentId,
      event_name: `accomplishment.publication.${event.action}`,
      event_family: 'business_mutation',
      module: 'accomplishments',
      subsystem: 'publication',
      outcome: event.insertedOrChanged ? 'success' : 'replayed',
      actor_type: 'user',
      target_type: 'accomplishment_publication',
      target_id: event.projectionId ?? event.accomplishmentId,
      target_organization_id: execCtx.organizationId,
      retention_class: 'business_audit',
      redaction_applied: true,
      new_values: {
        publication_version: event.publicationVersion,
        source_canonical_hash: event.sourceCanonicalHash,
        lifecycle_revision_id: event.lifecycleRevisionId,
        disclosure_policy_version: event.disclosurePolicyVersion,
        changed: event.insertedOrChanged,
      },
    })
  }
}
