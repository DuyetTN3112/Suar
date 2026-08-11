import type {
  TvaAutonomyLevel,
  TvaChangeClass,
  TvaCollaborationType,
  TvaConfirmationState,
  TvaEvidenceMode,
  TvaEvidenceReadinessState,
  TvaIsoTimestamp,
  TvaJsonObject,
  TvaJsonValue,
  TvaOwnershipLevel,
  TvaPrivacyClassification,
  TvaReadinessSeverity,
  TvaReferenceAccessState,
  TvaReferenceRelation,
  TvaReferenceType,
  TvaSha256,
  TvaSourceProvenanceV1,
  TvaTaskContractReadinessState,
  TvaUuid,
  TvaWorkReadinessState,
} from './primitives.js'

import type {
  MetadataAssignmentResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import type {
  TaxonomyCompletenessReport,
  TaxonomyDiagnostic,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'

export interface TaskSpecificationSectionV1 {
  readonly id: TvaUuid
  readonly key: string
  readonly title: string
  readonly plainText: string
  readonly critical: boolean
  readonly hasTextEquivalent: boolean
}

export interface TaskSpecificationVersionV1 {
  readonly schemaVersion: 'suar.task_specification_version.v1'
  readonly id: TvaUuid
  readonly taskId: TvaUuid
  readonly versionNumber: number
  readonly richContent: TvaJsonValue
  readonly plainTextProjection: string
  readonly sectionIndex: readonly TaskSpecificationSectionV1[]
  readonly projectContextVersionId: TvaUuid | null
  readonly workPackageVersionId: TvaUuid | null
  readonly authorId: TvaUuid
  readonly confirmationState: TvaConfirmationState
  readonly contentHash: TvaSha256
  readonly changeClass: TvaChangeClass
  readonly changeReason?: string | null
  readonly sourceProvenance: TvaSourceProvenanceV1
  readonly createdAt: TvaIsoTimestamp
}

export interface TaskContractListItemV1 {
  readonly id: TvaUuid
  readonly title: string
  readonly description: string
}

export interface TaskDeliverableV1 extends TaskContractListItemV1 {
  readonly expectedFormat: string | null
  readonly expectedLocation: string | null
}

export interface TaskAcceptanceCriterionV1 {
  readonly id: TvaUuid
  readonly statement: string
  readonly verificationMethod: string
  readonly critical: boolean
}

export interface TaskDependencyV1 extends TaskContractListItemV1 {
  readonly ownerId: TvaUuid | null
  readonly state: string
}

export interface TaskWorkContractV1 {
  readonly action: string
  readonly object: string
  readonly problemStatement: string
  readonly desiredOutcome: string
  readonly scope: readonly TaskContractListItemV1[]
  readonly outOfScope: readonly TaskContractListItemV1[]
  readonly deliverables: readonly TaskDeliverableV1[]
  readonly acceptanceCriteria: readonly TaskAcceptanceCriterionV1[]
  readonly qualityRequirements: readonly TaskContractListItemV1[]
  readonly constraints: readonly TaskContractListItemV1[]
  readonly dependencies: readonly TaskDependencyV1[]
  readonly roleInTask: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly autonomyLevel: TvaAutonomyLevel | null
  readonly collaborationType: TvaCollaborationType | null
  readonly environment: string | null
  readonly complexityContext: TvaJsonObject
  readonly impactScope: TvaJsonObject
  readonly estimatedUsersAffected: number | null
  readonly dueAt: TvaIsoTimestamp | null
}

export interface TaskEvidenceRequirementV1 {
  readonly id: TvaUuid
  readonly type: string
  readonly title: string
  readonly description: string
  readonly criterionIds: readonly TvaUuid[]
  readonly deliverableIds: readonly TvaUuid[]
  readonly required: boolean
  readonly privacyClassification: TvaPrivacyClassification
}

export interface TaskVerifierPolicyV1 {
  readonly reviewerIds: readonly TvaUuid[]
  readonly reviewerRoleCodes: readonly string[]
  readonly minimumReviewers: number
  readonly disallowSelfReview: boolean
}

export interface TaskCapabilityRequirementV1 {
  readonly id: TvaUuid
  readonly capabilityId: TvaUuid
  readonly capabilityName: string
  readonly minimumLevel: number | null
  readonly targetLevel: number | null
  readonly assessmentCeiling: number | null
  readonly rubricVersionId: TvaUuid | null
  readonly observableBehaviours: readonly string[]
}

export interface TaskEvidenceContractV1 {
  readonly mode: TvaEvidenceMode
  readonly requirements: readonly TaskEvidenceRequirementV1[]
  readonly verificationMethods: readonly string[]
  readonly verifierPolicy: TaskVerifierPolicyV1
  readonly reviewerVisibility?: 'project' | 'internal' | 'external' | 'all'
  readonly capabilities: readonly TaskCapabilityRequirementV1[]
  readonly profileEligibility: boolean
  readonly privacyClassification: TvaPrivacyClassification
}

export interface TaskSupportingReferenceV1 {
  readonly id: TvaUuid
  readonly type: TvaReferenceType
  readonly uri: string
  readonly title: string
  readonly relevantSection: string
  readonly relation: TvaReferenceRelation
  readonly accessState: TvaReferenceAccessState
  readonly privacyClassification: TvaPrivacyClassification
  readonly externalVersion: string | null
  readonly externalContentHash: TvaSha256 | null
  readonly addedBy: TvaUuid
  readonly addedAt: TvaIsoTimestamp
}

export interface TaskReadinessFindingV1 {
  readonly code: string
  readonly severity: TvaReadinessSeverity
  readonly fieldPath: string
  readonly sourcePath: string | null
  readonly message: string
  readonly remediationHint: string
}

export interface TaskReadinessResultV1 {
  readonly policyVersion: string
  readonly workState: TvaWorkReadinessState
  readonly evidenceState: TvaEvidenceReadinessState
  readonly assignmentReady: boolean
  readonly evidenceReady: boolean
  readonly blockers: readonly TaskReadinessFindingV1[]
  readonly warnings: readonly TaskReadinessFindingV1[]
  readonly assessedAt: TvaIsoTimestamp
}

export interface ResolvedTaskContractV1 {
  readonly schemaVersion: 'suar.resolved_task_contract.v1'
  readonly taskId: TvaUuid
  readonly versionId: TvaUuid
  readonly title: string
  readonly specification: {
    readonly versionId: TvaUuid
    readonly richContent: TvaJsonValue
    readonly plainText: string
    readonly sections: readonly TaskSpecificationSectionV1[]
  }
  readonly work: TaskWorkContractV1
  readonly evidence: TaskEvidenceContractV1
  readonly supportingReferences: readonly TaskSupportingReferenceV1[]
  readonly inheritedFrom: {
    readonly projectContextVersionId: TvaUuid | null
    readonly workPackageVersionId: TvaUuid | null
  }
  readonly readiness: TaskReadinessResultV1
  readonly resolvedContentHash: TvaSha256
}

export interface TaskContractVersionV1 {
  readonly schemaVersion: 'suar.task_contract_version.v1'
  readonly id: TvaUuid
  readonly taskId: TvaUuid
  readonly taskSpecificationVersionId: TvaUuid
  readonly versionNumber: number
  readonly workContract: TaskWorkContractV1
  readonly evidenceContract: TaskEvidenceContractV1
  readonly resolvedContract: ResolvedTaskContractV1
  readonly readinessState: TvaTaskContractReadinessState
  readonly creatorConfirmedBy: TvaUuid | null
  readonly creatorConfirmedAt: TvaIsoTimestamp | null
  readonly contentHash: TvaSha256
  readonly changeClass: TvaChangeClass
  readonly changeReason?: string | null
  readonly effectiveFrom: TvaIsoTimestamp
  readonly createdAt: TvaIsoTimestamp
}

export interface TaskAssignmentTaxonomyMetadataV1 {
  readonly schemaVersion: 'suar.task_assignment_taxonomy_metadata.v1'
  readonly entityId: TvaUuid
  readonly sourceRevision: string | null
  readonly projectedAt: TvaIsoTimestamp | null
  readonly assignments: MetadataAssignmentResult['assignments']
  readonly freeFormTags: MetadataAssignmentResult['freeFormTags']
  readonly taxonomyVersions: Readonly<Record<string, number>>
  readonly diagnostics: readonly TaxonomyDiagnostic[]
  readonly completeness: readonly TaxonomyCompletenessReport[]
  readonly providerVersions: NonNullable<MetadataAssignmentResult['providerVersions']> | null
}

export interface TaskAssignmentSnapshotProvenanceV1 {
  readonly projectContextVersionId: TvaUuid | null
  readonly workPackageVersionId: TvaUuid | null
  readonly taskSpecificationVersionId: TvaUuid
  readonly taskContractVersionId: TvaUuid
  readonly capabilityRubricVersionIds: readonly TvaUuid[]
}

export interface TaskAssignmentSnapshotV1 {
  readonly schemaVersion: 'suar.task_assignment_snapshot.v1'
  readonly id: TvaUuid
  readonly assignmentId: TvaUuid
  readonly taskId: TvaUuid
  readonly organizationId: TvaUuid
  readonly projectId: TvaUuid
  readonly assigneeId: TvaUuid
  readonly assignedBy: TvaUuid
  readonly roleInTask: string
  readonly ownershipLevel: TvaOwnershipLevel
  readonly resolvedContract: ResolvedTaskContractV1
  /**
   * Project-level business-domain context captured when the assignment contract
   * is pinned. It remains optional only so snapshots created before this
   * context existed can still be read.
   */
  readonly projectBusinessDomains?: readonly string[]
  /**
   * Metadata is captured at assignment time so accomplishment projections do not
   * consult the mutable Task row later. Optional for compatibility with legacy
   * snapshots created before taxonomy pinning was introduced.
   */
  readonly taxonomyMetadata?: TaskAssignmentTaxonomyMetadataV1 | null
  readonly provenance: TaskAssignmentSnapshotProvenanceV1
  readonly readinessFindingCodesResolved: readonly string[]
  readonly creatorConfirmation: {
    readonly confirmedBy: TvaUuid
    readonly confirmedAt: TvaIsoTimestamp
  }
  readonly acknowledgementRequired: boolean
  readonly snapshotHash: TvaSha256
  readonly createdAt: TvaIsoTimestamp
}
