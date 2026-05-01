import { BaseCommand } from '#modules/accomplishments/actions/base_command'
import { mapVerifiedAccomplishmentAggregate } from '#modules/accomplishments/actions/mappers/verified-work/verified_accomplishment_aggregate_mapper'
import type {
  AccomplishmentTransaction,
  AccomplishmentTransactionRunner,
} from '#modules/accomplishments/actions/ports/outbound/accomplishment_transaction'
import type {
  GovernedAccomplishmentProjectionSource,
  GovernedAccomplishmentProjectionSourceIdentity,
  GovernedAccomplishmentProjectionSourceReader,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import type {
  PersistedVerifiedAccomplishmentResult,
  VerifiedAccomplishmentWriter,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import {
  buildAccomplishmentProjectionIdentity,
  type AccomplishmentContentHasher,
} from '#modules/accomplishments/domain/verified-work/accomplishment_projection_identity'
import {
  projectGovernedCapabilitySignals,
  type GovernedCapabilitySignalProjection,
} from '#modules/accomplishments/domain/verified-work/capability_signal_projection_rules'
import {
  evaluateGovernedAccomplishmentProjectionSource,
  GOVERNED_ACCOMPLISHMENT_SOURCE_CODES,
} from '#modules/accomplishments/domain/verified-work/governed_accomplishment_projection_source_rules'
import { deriveVerifiedAccomplishmentContent } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_content_derivation'
import { evaluateVerifiedAccomplishmentGate } from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'

export const PROJECT_VERIFIED_ACCOMPLISHMENT_CODES = Object.freeze({
  sourceIdentityMismatch: 'TVA.ACCOMPLISHMENT.PROJECT.SOURCE_IDENTITY_MISMATCH',
  legacySourceIneligible: 'TVA.ACCOMPLISHMENT.PROJECT.LEGACY_SOURCE_INELIGIBLE',
  gateBlocked: 'TVA.ACCOMPLISHMENT.PROJECT.GATE_BLOCKED',
  derivationBlocked: 'TVA.ACCOMPLISHMENT.PROJECT.DERIVATION_BLOCKED',
  capabilityProjectionBlocked: 'TVA.ACCOMPLISHMENT.PROJECT.CAPABILITY_PROJECTION_BLOCKED',
  observationProvenanceMismatch:
    'TVA.ACCOMPLISHMENT.PROJECT.OBSERVATION_PROVENANCE_MISMATCH',
  contractInvalid: 'TVA.ACCOMPLISHMENT.PROJECT.CONTRACT_INVALID',
} as const)

export type ProjectVerifiedAccomplishmentCode =
  (typeof PROJECT_VERIFIED_ACCOMPLISHMENT_CODES)[keyof typeof PROJECT_VERIFIED_ACCOMPLISHMENT_CODES]

export class ProjectVerifiedAccomplishmentBlockedError extends BusinessLogicException {
  readonly blockerCodes: readonly string[]

  constructor(blockerCodes: readonly string[]) {
    super(blockerCodes[0] ?? PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.contractInvalid, {
      reasonCodes: blockerCodes,
    })
    this.blockerCodes = blockerCodes
  }
}

export interface ProjectVerifiedAccomplishmentDependencies {
  readonly sources: GovernedAccomplishmentProjectionSourceReader
  readonly writer: VerifiedAccomplishmentWriter
  readonly hasher: AccomplishmentContentHasher
  /**
   * Optional for characterization/unit callers. Production composition must
   * provide it so source reads and the aggregate write share one transaction.
   */
  readonly transactions?: AccomplishmentTransactionRunner
}

function capabilityEvidenceAccessState(
  availability: GovernedAccomplishmentProjectionSource['completionReport']['evidence'][number]['availability']
): 'available' | 'restricted' | 'unavailable' | 'unknown' {
  switch (availability) {
    case 'available':
      return 'available'
    case 'partially_available':
      return 'restricted'
    case 'unavailable':
      return 'unavailable'
    case 'not_disclosed':
      return 'unknown'
  }
}

export default class ProjectVerifiedAccomplishmentCommand extends BaseCommand<
  GovernedAccomplishmentProjectionSourceIdentity,
  PersistedVerifiedAccomplishmentResult
> {
  constructor(private readonly dependencies: ProjectVerifiedAccomplishmentDependencies) {
    super()
  }

  async execute(
    identity: GovernedAccomplishmentProjectionSourceIdentity,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedVerifiedAccomplishmentResult> {
    if (transaction) {
      return this.project(identity, transaction)
    }
    if (!this.dependencies.transactions) {
      return this.project(identity)
    }
    return this.dependencies.transactions.run((tx) =>
      this.project(identity, tx)
    )
  }

  private async project(
    identity: GovernedAccomplishmentProjectionSourceIdentity,
    transaction?: AccomplishmentTransaction
  ): Promise<PersistedVerifiedAccomplishmentResult> {
    const source = await this.dependencies.sources.load(identity, transaction)
    if (!source) throw new NotFoundException('Governed accomplishment projection source not found')
    const sourceIntegrity = evaluateGovernedAccomplishmentProjectionSource(
      {
        requestedIdentity: identity,
        loadedIdentity: source.identity,
        reviewHash: source.reviewHash,
        gate: source.gateInput,
        governedClaimRef: source.governedClaimRef,
        requirementContext: source.requirementContext,
        completionReport: source.completionReport,
        observationFacts: source.observationFacts,
        capabilityObservations: source.capabilityProjection?.observations ?? [],
      },
      this.dependencies.hasher
    )
    if (!sourceIntegrity.allowed) {
      const sourceCode = sourceIntegrity.blockerCodes.includes(
        GOVERNED_ACCOMPLISHMENT_SOURCE_CODES.observationProvenanceMismatch
      )
        ? PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.observationProvenanceMismatch
        : PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.sourceIdentityMismatch
      throw new ProjectVerifiedAccomplishmentBlockedError([
        sourceCode,
      ])
    }
    if (source.provenanceClass === 'legacy_unverified') {
      throw new ProjectVerifiedAccomplishmentBlockedError([
        PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.legacySourceIneligible,
      ])
    }

    const gate = evaluateVerifiedAccomplishmentGate(source.gateInput)
    if (!gate.allowed) {
      throw new ProjectVerifiedAccomplishmentBlockedError([
        PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.gateBlocked,
        ...gate.blockerCodes,
      ])
    }
    const derived = deriveVerifiedAccomplishmentContent({
      gate,
      governedClaimRef: source.governedClaimRef,
      requirementContext: source.requirementContext,
      report: source.completionReport,
    })
    if (!derived.allowed) {
      throw new ProjectVerifiedAccomplishmentBlockedError([
        PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.derivationBlocked,
        ...derived.blockerCodes,
      ])
    }

    const references = sourceIntegrity.observationReferences
    const facts = sourceIntegrity.observationFacts
    const projectionIdentity = buildAccomplishmentProjectionIdentity(
      {
        taskAssignmentId: source.gateInput.taskAssignmentId,
        assignmentSnapshotId: source.gateInput.assignmentSnapshotId,
        assignmentSnapshotHash: source.gateInput.assignmentSnapshotHash,
        completionReportId: source.gateInput.completionReportId,
        completionReportHash: source.gateInput.completionReportHash,
        subjectUserId: source.gateInput.claim.userId,
        completionClaims: [
          { id: source.governedClaimRef.claimId, hash: source.governedClaimRef.claimHash },
        ],
        reviewWorkflowId: source.identity.reviewWorkflowId,
        reviewObservations: references,
        semanticBoundary: {
          action: gate.action,
          object: gate.object,
          ownershipLevel: gate.ownershipLevel,
          deliverableIds: gate.deliverableIds,
          criterionResultIds: gate.criterionResultIds,
          evidenceIds: gate.evidenceIds,
        },
        policyVersion: source.identity.projectionPolicyVersion,
      },
      this.dependencies.hasher
    )

    let signals: readonly GovernedCapabilitySignalProjection[] = []
    if (source.capabilityProjection) {
      const projected = projectGovernedCapabilitySignals(
        {
          accomplishment: {
            id: projectionIdentity.accomplishmentId,
            subjectUserId: source.gateInput.claim.userId,
            taskAssignmentId: source.gateInput.taskAssignmentId,
            assignmentSnapshotId: source.gateInput.assignmentSnapshotId,
            assignmentSnapshotHash: source.gateInput.assignmentSnapshotHash,
            evidence: derived.content.evidenceReferences.map((evidence) => ({
              id: evidence.evidenceId,
              contentHash: evidence.contentHash,
              accessState: capabilityEvidenceAccessState(evidence.availability),
            })),
            gate,
          },
          ...source.capabilityProjection,
        },
        this.dependencies.hasher
      )
      if (!projected.allowed) {
        throw new ProjectVerifiedAccomplishmentBlockedError([
          PROJECT_VERIFIED_ACCOMPLISHMENT_CODES.capabilityProjectionBlocked,
          ...projected.blockerCodes,
        ])
      }
      signals = projected.signals
    }

    const aggregate = mapVerifiedAccomplishmentAggregate({
      source,
      gate,
      content: derived.content,
      projectionIdentity,
      observationIds: references.map(({ id }) => id),
      observationFacts: facts,
      signals,
      hasher: this.dependencies.hasher,
    })
    return this.dependencies.writer.createOrLoad(aggregate, transaction)
  }
}
