import type {
  VerifiedAccomplishmentGateResult,
  VerifiedAccomplishmentGatePassed,
} from '#modules/accomplishments/domain/verified-work/verified_accomplishment_projection_rules'
import type { CompletionClaimV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'
import type {
  TvaAutonomyLevel,
  TvaCriterionResult,
  TvaJsonObject,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaSha256,
} from '#modules/tasks/public_contracts/task-authoring/primitives'

export const VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES = Object.freeze({
  gateNotPassed: 'TVA.ACCOMPLISHMENT.DERIVATION.GATE_NOT_PASSED',
  targetClaimMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.TARGET_CLAIM_MISSING',
  duplicateSourceFact: 'TVA.ACCOMPLISHMENT.DERIVATION.DUPLICATE_SOURCE_FACT',
  sourceProvenanceMismatch: 'TVA.ACCOMPLISHMENT.DERIVATION.SOURCE_PROVENANCE_MISMATCH',
  gateBoundaryMismatch: 'TVA.ACCOMPLISHMENT.DERIVATION.GATE_BOUNDARY_MISMATCH',
  deliverableRefMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.DELIVERABLE_REF_MISSING',
  criterionResultRefMissing:
    'TVA.ACCOMPLISHMENT.DERIVATION.CRITERION_RESULT_REF_MISSING',
  evidenceRefMissing: 'TVA.ACCOMPLISHMENT.DERIVATION.EVIDENCE_REF_MISSING',
  claimEvidenceMappingMissing:
    'TVA.ACCOMPLISHMENT.DERIVATION.CLAIM_EVIDENCE_MAPPING_MISSING',
} as const)

export type VerifiedAccomplishmentDerivationCode =
  (typeof VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES)[keyof typeof VERIFIED_ACCOMPLISHMENT_DERIVATION_CODES]

export interface ImmutableRequirementConstraintContext {
  readonly id: string
  readonly description: string
}

export interface ImmutableRequirementDeliverableContext {
  readonly id: string
  readonly title: string
  readonly kind: string
  readonly summary: string | null
}

export interface ImmutableAccomplishmentRequirementContext {
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskSpecificationVersionId: string
  readonly taskSpecificationHash: TvaSha256
  readonly taskContractVersionId: string
  readonly taskContractHash: TvaSha256
  readonly businessContext: string | null
  readonly systemArea: string | null
  readonly environment: string | null
  readonly scaleSummary: string | null
  readonly constraints: readonly ImmutableRequirementConstraintContext[]
  readonly deliverables: readonly ImmutableRequirementDeliverableContext[]
}

export interface AccomplishmentCompletionClaimFact {
  readonly claim: CompletionClaimV1
  readonly claimHash: TvaSha256
}

export interface AccomplishmentCriterionResultFact {
  readonly id: string
  readonly completionReportId: string
  readonly actualOutcome: string
  readonly result: TvaCriterionResult
  readonly explanation: string
}

export interface AccomplishmentEvidenceFact {
  readonly id: string
  readonly completionReportId: string
  readonly evidenceType: string
  readonly accessClassification: TvaPrivacyClassification
  readonly availability: 'available' | 'partially_available' | 'unavailable' | 'not_disclosed'
  readonly contentHash: TvaSha256 | null
}

export interface AccomplishmentClaimEvidenceMappingFact {
  readonly completionReportId: string
  readonly contributorClaimId: string
  readonly evidenceId: string
}

export interface AccomplishmentCompletionReportFacts {
  readonly id: string
  readonly completionReportHash: TvaSha256
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly assignmentSnapshotId: string
  readonly assignmentSnapshotHash: TvaSha256
  readonly taskContractVersionId: string
  readonly claims: readonly AccomplishmentCompletionClaimFact[]
  readonly criterionResults: readonly AccomplishmentCriterionResultFact[]
  readonly evidence: readonly AccomplishmentEvidenceFact[]
  readonly claimEvidenceMappings: readonly AccomplishmentClaimEvidenceMappingFact[]
}

export interface VerifiedAccomplishmentDerivationInput {
  readonly gate: VerifiedAccomplishmentGateResult
  readonly governedClaimRef: {
    readonly claimId: string
    readonly claimHash: TvaSha256
    readonly subjectUserId: string
  }
  readonly requirementContext: ImmutableAccomplishmentRequirementContext
  readonly report: AccomplishmentCompletionReportFacts
}

export interface DerivedAccomplishmentContent {
  readonly userId: string
  readonly taskId: string
  readonly taskAssignmentId: string
  readonly title: string
  readonly conciseStatement: string
  readonly detailedStatement: string
  readonly action: string
  readonly object: string
  readonly role: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly autonomyLevel: TvaAutonomyLevel | null
  readonly context: {
    readonly businessContext: string | null
    readonly systemArea: string | null
    readonly environment: string | null
    readonly scaleSummary: string | null
    readonly constraints: readonly string[]
  }
  readonly deliverables: readonly {
    readonly deliverableRef: string
    readonly title: string
    readonly kind: string
    readonly summary: string | null
  }[]
  readonly outcomes: readonly {
    readonly outcomeRef: string
    readonly statement: string
    readonly result: TvaCriterionResult
    readonly explanation: string
  }[]
  readonly reportedOutcomeData: TvaJsonObject
  readonly evidenceReferences: readonly {
    readonly evidenceId: string
    readonly evidenceType: string
    readonly accessClassification: TvaPrivacyClassification
    readonly availability: AccomplishmentEvidenceFact['availability']
    readonly contentHash: TvaSha256 | null
  }[]
  readonly verification: {
    readonly lifecycleState: VerifiedAccomplishmentGatePassed['lifecycleState']
    readonly reviewObservations: readonly {
      readonly observationId: string
      readonly revisionHash: TvaSha256
    }[]
    readonly reviewerReferences: readonly {
      readonly reviewerId: string
      readonly reviewerRole: string
    }[]
  }
  readonly provenance: {
    readonly taskSpecificationVersionId: string
    readonly taskSpecificationHash: TvaSha256
    readonly taskContractVersionId: string
    readonly taskContractHash: TvaSha256
    readonly assignmentSnapshotId: string
    readonly assignmentSnapshotHash: TvaSha256
    readonly completionReportId: string
    readonly completionReportHash: TvaSha256
    readonly completionClaimId: string
    readonly completionClaimHash: TvaSha256
  }
}

export interface VerifiedAccomplishmentDerivationBlocked {
  readonly allowed: false
  readonly blockerCodes: readonly VerifiedAccomplishmentDerivationCode[]
}

export interface VerifiedAccomplishmentDerivationPassed {
  readonly allowed: true
  readonly blockerCodes: readonly []
  readonly content: DerivedAccomplishmentContent
}

export type VerifiedAccomplishmentDerivationResult =
  | VerifiedAccomplishmentDerivationBlocked
  | VerifiedAccomplishmentDerivationPassed
