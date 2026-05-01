import { BaseCommand } from '#modules/accomplishments/actions/base_command'
import type { AccomplishmentTransactionRunner } from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  AccomplishmentPublicProjectionWriter,
  RetiredAccomplishmentPublicProjectionResult,
  UnversionedAccomplishmentPublicProjection,
} from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_public_projection_writer'
import type { AccomplishmentPublicationAuditWriter } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_audit_writer'
import type { AccomplishmentPublicationCacheInvalidator } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_cache_invalidator'
import type { AccomplishmentPublicationSearchReindexStager } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_search_reindex_stager'
import type { GovernedAccomplishmentPublicationSourceReader } from '#modules/accomplishments/actions/ports/outbound/publication/governed_accomplishment_publication_source_reader'
import {
  buildAccomplishmentPublicationIdentity,
  hashAccomplishmentDisclosureDecision,
  hashAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_identity'
import {
  ACCOMPLISHMENT_PUBLICATION_CODES,
  deriveApprovedPublicProjectionFields,
  evaluateAccomplishmentPublicationGate,
  type AccomplishmentPublicationCode,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import {
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export class PublishAccomplishmentPublicProjectionBlockedError extends BusinessLogicException {
  readonly blockerCodes: readonly string[]

  constructor(blockerCodes: readonly string[]) {
    super(blockerCodes[0] ?? ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid, {
      reasonCodes: blockerCodes,
    })
    this.blockerCodes = blockerCodes
  }
}

export type RecruiterFacingAccomplishmentProjection = Omit<
  AccomplishmentPublicProjectionV1,
  'accomplishmentId' | 'userId' | 'sourceLifecycleRevisionId' | 'sourceCanonicalHash'
>

export interface PublishAccomplishmentPublicProjectionInput {
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly idempotencyKey: string
  readonly expectedSourceCanonicalHash: string
  readonly expectedLifecycleRevisionId: string
  readonly expectedDisclosureDecisionHash: string
  readonly expectedDisclosurePolicyVersion: string
  readonly consentFactId: string
  readonly consentFactHash: string
  readonly auditContext: AuditActionContext
}

export interface PublishAccomplishmentPublicProjectionResult {
  readonly inserted: boolean
  readonly projection: RecruiterFacingAccomplishmentProjection
}

export interface PublishAccomplishmentPublicProjectionDependencies {
  readonly sources: GovernedAccomplishmentPublicationSourceReader
  readonly writer: AccomplishmentPublicProjectionWriter
  readonly hasher: AccomplishmentContentHasher
  readonly auditWriter: AccomplishmentPublicationAuditWriter
  readonly cacheInvalidator?: AccomplishmentPublicationCacheInvalidator
  readonly transactions?: AccomplishmentTransactionRunner
  readonly searchReindexStager?: AccomplishmentPublicationSearchReindexStager
}

export interface UnpublishAccomplishmentPublicProjectionInput {
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly projectionId: string
  readonly publicationVersion: number
  readonly confirmed: boolean
  readonly retiredAt: string
  readonly auditContext: AuditActionContext
}

function publicView(
  projection: AccomplishmentPublicProjectionV1
): RecruiterFacingAccomplishmentProjection {
  const {
    accomplishmentId: _accomplishmentId,
    userId: _userId,
    sourceLifecycleRevisionId: _sourceLifecycleRevisionId,
    sourceCanonicalHash: _sourceCanonicalHash,
    ...safe
  } = projection
  return safe
}

function assertTimestamp(value: string, code: AccomplishmentPublicationCode): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new PublishAccomplishmentPublicProjectionBlockedError([code])
  }
}

export class PublishAccomplishmentPublicProjectionCommand extends BaseCommand<
  PublishAccomplishmentPublicProjectionInput,
  PublishAccomplishmentPublicProjectionResult
> {
  constructor(private readonly dependencies: PublishAccomplishmentPublicProjectionDependencies) {
    super()
  }

  async execute(
    input: PublishAccomplishmentPublicProjectionInput
  ): Promise<PublishAccomplishmentPublicProjectionResult> {
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid,
      ])
    }
    const source = await this.dependencies.sources.loadForPublication(input.accomplishmentId)
    if (!source) {
      throw new NotFoundException('Verified accomplishment not found')
    }
    if (source.accomplishment.userId !== input.actorUserId) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.actorNotOwner,
      ])
    }

    const canonicalHash = hashVerifiedAccomplishmentPayload(
      source.accomplishment,
      this.dependencies.hasher
    )
    if (canonicalHash !== source.accomplishment.canonicalHash) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.canonicalIntegrityMismatch,
      ])
    }
    const { decisionHash, ...decisionWithoutHash } = source.disclosureDecision
    if (
      hashAccomplishmentDisclosureDecision(decisionWithoutHash, this.dependencies.hasher) !==
      decisionHash
    ) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.decisionIntegrityMismatch,
      ])
    }
    const { consentFactHash, ...consentWithoutHash } = source.publicationConsent
    if (
      hashAccomplishmentPublicationConsent(consentWithoutHash, this.dependencies.hasher) !==
      consentFactHash
    ) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.consentIntegrityMismatch,
      ])
    }
    if (
      input.expectedSourceCanonicalHash !== source.accomplishment.canonicalHash ||
      input.expectedLifecycleRevisionId !== source.lifecycleRevisionId ||
      input.expectedDisclosureDecisionHash !== source.disclosureDecision.decisionHash ||
      input.expectedDisclosurePolicyVersion !== source.disclosureDecision.policyVersion ||
      input.consentFactId !== source.publicationConsent.consentFactId ||
      input.consentFactHash !== source.publicationConsent.consentFactHash ||
      source.publicationConsent.sourceLifecycleRevisionId !== source.lifecycleRevisionId
    ) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.sourcePinMismatch,
      ])
    }
    assertTimestamp(
      source.publicationConsent.consentedAt,
      ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid
    )

    const gate = evaluateAccomplishmentPublicationGate({
      accomplishment: source.accomplishment,
      lifecycleState: source.lifecycleState,
      hasOpenDispute: source.hasOpenDispute,
      consent: source.publicationConsent,
      decision: source.disclosureDecision,
      allowedCapabilities: source.allowedCapabilities,
    })
    if (!gate.allowed) {
      throw new PublishAccomplishmentPublicProjectionBlockedError(gate.blockerCodes)
    }
    if (
      source.lifecycleState !== 'verified' &&
      source.lifecycleState !== 'partially_verified'
    ) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.sourceNotVerified,
      ])
    }

    const verifiedAt = source.accomplishment.verification.verifiedAt
    if (!verifiedAt) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.sourceNotVerified,
      ])
    }
    const identity = buildAccomplishmentPublicationIdentity(
      {
        accomplishmentId: source.accomplishment.id,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
      },
      this.dependencies.hasher
    )
    const approved = deriveApprovedPublicProjectionFields(
      source.accomplishment,
      source.disclosureDecision
    )
    const projection: UnversionedAccomplishmentPublicProjection = {
      contractVersion: 1,
      id: identity.projectionId,
      accomplishmentId: source.accomplishment.id,
      userId: source.accomplishment.userId,
      sourceLifecycleRevisionId: source.lifecycleRevisionId,
      sourceCanonicalHash: source.accomplishment.canonicalHash,
      ...approved,
      verification: {
        status: source.lifecycleState,
        methodLabel: source.disclosureDecision.content.verificationMethodLabel,
        confidenceBand: source.accomplishment.verification.confidenceBand,
        reviewerRoleLabels: [...source.disclosureDecision.content.reviewerRoleLabels],
        verifiedAt,
        evidenceAvailability: source.disclosureDecision.content.evidenceAvailability,
        provenanceClass: source.accomplishment.provenance.provenanceClass,
      },
      disclosure: {
        redactionState: source.disclosureDecision.content.redactionState,
        disclosurePolicyVersion: source.disclosureDecision.policyVersion,
        organizationLabel: source.disclosureDecision.content.organizationLabel,
        projectLabel: source.disclosureDecision.content.projectLabel,
      },
      publishedAt: source.publicationConsent.consentedAt,
      sourceUpdatedAt: source.accomplishment.updatedAt,
    }
    const persist = async (transaction?: object) => {
      const persisted = await this.dependencies.writer.publish(
        { projectionKey: identity.projectionKey, projection },
        transaction
      )
      if (persisted.inserted && transaction && this.dependencies.searchReindexStager) {
        await this.dependencies.searchReindexStager.stage(transaction, {
          userId: persisted.projection.userId,
          projectionId: persisted.projection.id,
          publicationVersion: persisted.projection.publicationVersion,
          operation: 'published',
          sourceEventId: persisted.projection.id,
        })
      }
      return persisted
    }
    const persisted = this.dependencies.transactions
      ? await this.dependencies.transactions.run(persist)
      : await persist()
    await this.dependencies.auditWriter.record(
      {
        action: 'publish',
        accomplishmentId: source.accomplishment.id,
        actorUserId: input.actorUserId,
        projectionId: persisted.projection.id,
        publicationVersion: persisted.projection.publicationVersion,
        insertedOrChanged: persisted.inserted,
        sourceCanonicalHash: source.accomplishment.canonicalHash,
        lifecycleRevisionId: source.lifecycleRevisionId,
        disclosurePolicyVersion: source.disclosureDecision.policyVersion,
      },
      input.auditContext
    )
    await this.dependencies.cacheInvalidator?.invalidateUserWorkHistory(source.accomplishment.userId)
    return { inserted: persisted.inserted, projection: publicView(persisted.projection) }
  }
}

export default PublishAccomplishmentPublicProjectionCommand

export class UnpublishAccomplishmentPublicProjectionCommand extends BaseCommand<
  UnpublishAccomplishmentPublicProjectionInput,
  RetiredAccomplishmentPublicProjectionResult
> {
  constructor(
    private readonly dependencies: Pick<
      PublishAccomplishmentPublicProjectionDependencies,
      | 'sources'
      | 'writer'
      | 'auditWriter'
      | 'cacheInvalidator'
      | 'transactions'
      | 'searchReindexStager'
    >
  ) {
    super()
  }

  async execute(input: UnpublishAccomplishmentPublicProjectionInput) {
    if (!input.confirmed) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.consentRequired,
      ])
    }
    assertTimestamp(input.retiredAt, ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid)
    const source = await this.dependencies.sources.loadForPublication(input.accomplishmentId)
    if (!source) {
      throw new NotFoundException('Verified accomplishment not found')
    }
    if (source.accomplishment.userId !== input.actorUserId) {
      throw new PublishAccomplishmentPublicProjectionBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.actorNotOwner,
      ])
    }
    const retire = async (transaction?: object) => {
      const retired = await this.dependencies.writer.retireActive(
        {
          accomplishmentId: source.accomplishment.id,
          subjectUserId: source.accomplishment.userId,
          projectionId: input.projectionId,
          publicationVersion: input.publicationVersion,
          retiredAt: input.retiredAt,
        },
        transaction
      )
      if (retired.changed && transaction && this.dependencies.searchReindexStager) {
        await this.dependencies.searchReindexStager.stage(transaction, {
          userId: source.accomplishment.userId,
          projectionId: retired.projectionId ?? input.projectionId,
          publicationVersion: retired.publicationVersion ?? input.publicationVersion,
          operation: 'unpublished',
          sourceEventId: retired.projectionId ?? input.projectionId,
        })
      }
      return retired
    }
    const retired = this.dependencies.transactions
      ? await this.dependencies.transactions.run(retire)
      : await retire()
    await this.dependencies.auditWriter.record(
      {
        action: 'unpublish',
        accomplishmentId: source.accomplishment.id,
        actorUserId: input.actorUserId,
        projectionId: retired.projectionId,
        publicationVersion: retired.publicationVersion,
        insertedOrChanged: retired.changed,
        sourceCanonicalHash: null,
        lifecycleRevisionId: null,
        disclosurePolicyVersion: null,
      },
      input.auditContext
    )
    await this.dependencies.cacheInvalidator?.invalidateUserWorkHistory(source.accomplishment.userId)
    return retired
  }
}
