import type {
  RecruiterFacingAccomplishmentProjection,
  UnpublishAccomplishmentPublicProjectionInput,
} from '#modules/accomplishments/actions/commands/publication/publish_accomplishment_public_projection_command'
import type { RetiredAccomplishmentPublicProjectionResult } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_writer'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'

export interface AccomplishmentPublicationInput {
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly idempotencyKey: string
  readonly expectedSourceCanonicalHash: string
  readonly expectedLifecycleRevisionId: string
  readonly confirmed: boolean
  readonly now: string
  readonly auditContext: AuditActionContext
}

export interface AccomplishmentPublicationResult {
  readonly inserted: boolean
  readonly projection: RecruiterFacingAccomplishmentProjection
}

export abstract class AccomplishmentPublicationFactory {
  abstract publish(
    input: AccomplishmentPublicationInput
  ): Promise<AccomplishmentPublicationResult>

  abstract unpublish(
    input: UnpublishAccomplishmentPublicProjectionInput
  ): Promise<RetiredAccomplishmentPublicProjectionResult>
}
