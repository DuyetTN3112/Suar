import { BaseCommand } from '#modules/accomplishments/actions/base_command'
import type { AccomplishmentDisclosurePolicy } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_disclosure_policy'
import type { AccomplishmentPublicationFactsStore } from '#modules/accomplishments/actions/ports/outbound/publication/accomplishment_publication_facts_store'
import {
  deterministicUuidFromSha256,
  hashVerifiedAccomplishmentPayload,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  hashAccomplishmentDisclosureDecision,
  hashAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_identity'
import {
  ACCOMPLISHMENT_PUBLICATION_CODES,
  type AuthoritativeAccomplishmentDisclosureDecision,
  type AuthoritativeAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export class PrepareAccomplishmentPublicationBlockedError extends BusinessLogicException {
  readonly blockerCodes: readonly string[]

  constructor(blockerCodes: readonly string[]) {
    super(blockerCodes[0] ?? ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid, {
      reasonCodes: blockerCodes,
    })
    this.blockerCodes = blockerCodes
  }
}

export interface PrepareAccomplishmentPublicationInput {
  readonly accomplishmentId: string
  readonly actorUserId: string
  readonly idempotencyKey: string
  readonly expectedSourceCanonicalHash: string
  readonly expectedLifecycleRevisionId: string
  readonly confirmed: boolean
  readonly now: string
}

export interface PrepareAccomplishmentPublicationResult {
  readonly granted: boolean
  readonly decision: AuthoritativeAccomplishmentDisclosureDecision
  readonly consent: AuthoritativeAccomplishmentPublicationConsent
}

interface Dependencies {
  readonly facts: AccomplishmentPublicationFactsStore
  readonly hasher: AccomplishmentContentHasher
  readonly disclosurePolicy: AccomplishmentDisclosurePolicy
}

function assertTimestamp(value: string): void {
  if (Number.isNaN(new Date(value).getTime())) {
    throw new PrepareAccomplishmentPublicationBlockedError([
      ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid,
    ])
  }
}

function decisionContent(
  source: Awaited<ReturnType<AccomplishmentPublicationFactsStore['loadCanonicalSource']>>
): AuthoritativeAccomplishmentDisclosureDecision['content'] {
  if (!source) {
    throw new PrepareAccomplishmentPublicationBlockedError([
      ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid,
    ])
  }
  const { accomplishment, allowedCapabilities } = source

  return {
    title: accomplishment.title,
    conciseStatement: accomplishment.conciseStatement,
    taskType: accomplishment.taskType,
    businessDomain: accomplishment.businessDomain,
    problemCategory: accomplishment.problemCategory,
    role: accomplishment.role,
    autonomyLevel: accomplishment.autonomyLevel,
    collaborationType: accomplishment.collaborationType,
    environment: accomplishment.context.environment,
    systemArea: accomplishment.context.systemArea,
    scaleSummary: accomplishment.context.scaleSummary,
    deliverableSummaries: accomplishment.deliverables.map(
      (deliverable) => deliverable.summary ?? deliverable.title
    ),
    outcomeSummaries: accomplishment.outcomes.map((outcome) => outcome.statement),
    technology: [...accomplishment.technology],
    capabilities: allowedCapabilities.map((capability) => ({ ...capability })),
    verificationMethodLabel: accomplishment.verification.method,
    reviewerRoleLabels: accomplishment.verification.reviewerReferences.map(
      (reviewer) => reviewer.reviewerRole
    ),
    evidenceAvailability: 'not_disclosed',
    redactionState: 'generalized',
    organizationLabel: null,
    projectLabel: null,
  }
}

export class PrepareAccomplishmentPublicationCommand extends BaseCommand<
  PrepareAccomplishmentPublicationInput,
  PrepareAccomplishmentPublicationResult
> {
  constructor(private readonly dependencies: Dependencies) {
    super()
  }

  async execute(
    input: PrepareAccomplishmentPublicationInput
  ): Promise<PrepareAccomplishmentPublicationResult> {
    if (!input.confirmed) {
      throw new PrepareAccomplishmentPublicationBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.consentRequired,
      ])
    }
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
      throw new PrepareAccomplishmentPublicationBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.contractInvalid,
      ])
    }
    assertTimestamp(input.now)

    const source = await this.dependencies.facts.loadCanonicalSource(input.accomplishmentId)
    if (!source) throw new NotFoundException('Verified accomplishment not found')
    if (source.accomplishment.userId !== input.actorUserId) {
      throw new PrepareAccomplishmentPublicationBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.actorNotOwner,
      ])
    }
    if (
      hashVerifiedAccomplishmentPayload(source.accomplishment, this.dependencies.hasher) !==
        source.accomplishment.canonicalHash ||
      input.expectedSourceCanonicalHash !== source.accomplishment.canonicalHash ||
      input.expectedLifecycleRevisionId !== source.lifecycleRevisionId
    ) {
      throw new PrepareAccomplishmentPublicationBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.sourcePinMismatch,
      ])
    }

    const policy = this.dependencies.disclosurePolicy.evaluate({
      actorUserId: input.actorUserId,
      source,
    })
    if (!policy.allowed) {
      throw new PrepareAccomplishmentPublicationBlockedError([
        ACCOMPLISHMENT_PUBLICATION_CODES.disclosureDenied,
      ])
    }

    const existing = await this.dependencies.facts.loadPreparedPublication(
      input.accomplishmentId,
      input.idempotencyKey
    )
    if (existing) {
      if (
        existing.consent.sourceCanonicalHash !== source.accomplishment.canonicalHash ||
        existing.consent.sourceLifecycleRevisionId !== source.lifecycleRevisionId
      ) {
        throw new PrepareAccomplishmentPublicationBlockedError([
          ACCOMPLISHMENT_PUBLICATION_CODES.sourcePinMismatch,
        ])
      }
      return {
        granted: existing.consent.granted,
        decision: existing.decision,
        consent: existing.consent,
      }
    }

    const decisionWithoutHash = {
      decisionId: deterministicUuidFromSha256(
        this.dependencies.hasher.hash({
          schemaVersion: 'suar.accomplishment_disclosure_decision_identity.v1',
          accomplishmentId: input.accomplishmentId,
          actorUserId: input.actorUserId,
          idempotencyKey: input.idempotencyKey,
        })
      ),
      accomplishmentId: source.accomplishment.id,
      subjectUserId: source.accomplishment.userId,
      allowed: policy.allowed,
      policyVersion: policy.policyVersion,
      decidedAt: input.now,
      content: decisionContent(source),
    } satisfies Omit<AuthoritativeAccomplishmentDisclosureDecision, 'decisionHash'>
    const decision: AuthoritativeAccomplishmentDisclosureDecision = {
      ...decisionWithoutHash,
      decisionHash: hashAccomplishmentDisclosureDecision(
        decisionWithoutHash,
        this.dependencies.hasher
      ),
    }

    const consentWithoutHash = {
      consentFactId: deterministicUuidFromSha256(
        this.dependencies.hasher.hash({
          schemaVersion: 'suar.accomplishment_publication_consent_identity.v1',
          accomplishmentId: input.accomplishmentId,
          actorUserId: input.actorUserId,
          idempotencyKey: input.idempotencyKey,
        })
      ),
      accomplishmentId: source.accomplishment.id,
      subjectUserId: source.accomplishment.userId,
      granted: true,
      sourceCanonicalHash: source.accomplishment.canonicalHash,
      sourceLifecycleRevisionId: source.lifecycleRevisionId,
      disclosureDecisionId: decision.decisionId,
      disclosureDecisionHash: decision.decisionHash,
      disclosurePolicyVersion: decision.policyVersion,
      consentedAt: input.now,
    } satisfies Omit<AuthoritativeAccomplishmentPublicationConsent, 'consentFactHash'>
    const consent: AuthoritativeAccomplishmentPublicationConsent = {
      ...consentWithoutHash,
      consentFactHash: hashAccomplishmentPublicationConsent(
        consentWithoutHash,
        this.dependencies.hasher
      ),
    }

    await this.dependencies.facts.appendDecision(decision)
    await this.dependencies.facts.appendConsent({
      ...consent,
      idempotencyKey: input.idempotencyKey,
    })
    return { granted: true, decision, consent }
  }
}

export default PrepareAccomplishmentPublicationCommand
