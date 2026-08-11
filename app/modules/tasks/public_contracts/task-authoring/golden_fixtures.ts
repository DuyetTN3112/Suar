import { TVA_SCHEMA_VERSIONS, type TvaSha256 } from './primitives.js'
import type {
  ResolvedTaskContractV1,
  TaskAssignmentSnapshotV1,
  TaskContractVersionV1,
  TaskEvidenceContractV1,
  TaskSpecificationVersionV1,
  TaskWorkContractV1,
} from './task_contracts.js'

import type {
  ProjectContextVersionV1,
  WorkPackageV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'
import type {
  CompletionClaimV1,
  LegacyTaskSubmissionV1,
  ReviewObservationV1,
} from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const ids = Object.freeze({
  organization: '00000000-0000-4000-8000-000000000001',
  project: '00000000-0000-4000-8000-000000000002',
  projectContext: '00000000-0000-4000-8000-000000000003',
  workPackage: '00000000-0000-4000-8000-000000000004',
  workPackageVersion: '00000000-0000-4000-8000-000000000005',
  task: '00000000-0000-4000-8000-000000000006',
  specification: '00000000-0000-4000-8000-000000000007',
  contract: '00000000-0000-4000-8000-000000000008',
  assignment: '00000000-0000-4000-8000-000000000009',
  snapshot: '00000000-0000-4000-8000-000000000010',
  creator: '00000000-0000-4000-8000-000000000011',
  assignee: '00000000-0000-4000-8000-000000000012',
  reviewer: '00000000-0000-4000-8000-000000000013',
  scope: '00000000-0000-4000-8000-000000000014',
  outOfScope: '00000000-0000-4000-8000-000000000015',
  deliverable: '00000000-0000-4000-8000-000000000016',
  criterion: '00000000-0000-4000-8000-000000000017',
  quality: '00000000-0000-4000-8000-000000000018',
  constraint: '00000000-0000-4000-8000-000000000019',
  dependency: '00000000-0000-4000-8000-000000000020',
  evidenceRequirement: '00000000-0000-4000-8000-000000000021',
  capabilityRequirement: '00000000-0000-4000-8000-000000000022',
  capability: '00000000-0000-4000-8000-000000000023',
  rubricVersion: '00000000-0000-4000-8000-000000000024',
  supportingReference: '00000000-0000-4000-8000-000000000025',
  section: '00000000-0000-4000-8000-000000000026',
  completionReport: '00000000-0000-4000-8000-000000000027',
  completionClaim: '00000000-0000-4000-8000-000000000028',
  criterionResult: '00000000-0000-4000-8000-000000000029',
  evidenceItem: '00000000-0000-4000-8000-000000000030',
  reviewWorkflow: '00000000-0000-4000-8000-000000000031',
  reviewSession: '00000000-0000-4000-8000-000000000032',
  reviewObservation: '00000000-0000-4000-8000-000000000033',
  legacySubmission: '00000000-0000-4000-8000-000000000034',
})

const at = '2026-08-01T08:00:00.000Z'
const hash = (character: string): TvaSha256 => `sha256:${character.repeat(64)}`

const nativeSource = Object.freeze({
  class: 'native_prework',
  sourceType: 'authored',
  sourceReferenceIds: [] as readonly string[],
  confirmedBy: ids.creator,
  confirmedAt: at,
} as const)

export const PROJECT_CONTEXT_VERSION_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.projectContextVersion,
  id: ids.projectContext,
  organizationId: ids.organization,
  projectId: ids.project,
  versionNumber: 1,
  title: 'Pre-order commerce platform context',
  summary: 'Shared architecture, glossary, constraints, and delivery defaults.',
  richContent: {
    type: 'document',
    sections: [{ title: 'Architecture', text: 'Order, inventory, and payment services.' }],
  },
  plainTextProjection: 'Architecture: Order, inventory, and payment services.',
  structuredDefaults: {
    environment: 'staging',
    standards: ['OpenAPI 3.1', 'idempotent commands'],
  },
  activeFrom: at,
  retiredAt: null,
  createdBy: ids.creator,
  confirmedBy: ids.creator,
  changeClass: 'initial',
  changeReason: 'Initial confirmed project context',
  privacyClassification: 'internal',
  contentHash: hash('1'),
  sourceProvenance: nativeSource,
  createdAt: at,
} as const satisfies ProjectContextVersionV1)

export const WORK_PACKAGE_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.workPackage,
  id: ids.workPackage,
  organizationId: ids.organization,
  projectId: ids.project,
  key: 'PREORDER-API',
  title: 'Pre-order API capability',
  summary: 'Design and implement the pre-order order lifecycle API.',
  state: 'active',
  activeVersionId: ids.workPackageVersion,
  createdBy: ids.creator,
  createdAt: at,
  archivedAt: null,
} as const satisfies WorkPackageV1)

export const WORK_PACKAGE_VERSION_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.workPackageVersion,
  id: ids.workPackageVersion,
  workPackageId: ids.workPackage,
  projectId: ids.project,
  projectContextVersionId: ids.projectContext,
  versionNumber: 1,
  title: 'Pre-order API capability',
  summary: 'Shared feature behavior and integration constraints.',
  richContent: {
    type: 'document',
    sections: [{ title: 'Lifecycle', text: 'Created, reserved, confirmed, cancelled.' }],
  },
  plainTextProjection: 'Lifecycle: Created, reserved, confirmed, cancelled.',
  structuredOverrides: {
    systemArea: 'order-management',
    dependencies: ['inventory reservation', 'payment authorization'],
  },
  authorId: ids.creator,
  confirmedBy: ids.creator,
  changeClass: 'initial',
  changeReason: 'Initial feature context',
  privacyClassification: 'internal',
  contentHash: hash('2'),
  sourceProvenance: nativeSource,
  createdAt: at,
} as const satisfies WorkPackageVersionV1)

export const TASK_SPECIFICATION_VERSION_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.taskSpecificationVersion,
  id: ids.specification,
  taskId: ids.task,
  versionNumber: 1,
  richContent: {
    type: 'document',
    sections: [
      {
        title: 'Requirements',
        text: 'Define the API lifecycle, error contract, idempotency, and integration behavior.',
      },
    ],
  },
  plainTextProjection:
    'Define the API lifecycle, error contract, idempotency, and integration behavior.',
  sectionIndex: [
    {
      id: ids.section,
      key: 'requirements',
      title: 'Requirements',
      plainText: 'Define lifecycle, error contract, idempotency, and integrations.',
      critical: true,
      hasTextEquivalent: true,
    },
  ],
  projectContextVersionId: ids.projectContext,
  workPackageVersionId: ids.workPackageVersion,
  authorId: ids.creator,
  confirmationState: 'creator_confirmed',
  contentHash: hash('3'),
  changeClass: 'initial',
  changeReason: 'Initial self-contained specification',
  sourceProvenance: nativeSource,
  createdAt: at,
} as const satisfies TaskSpecificationVersionV1)

export const TASK_WORK_CONTRACT_V1_FIXTURE = Object.freeze({
  action: 'design_and_implement',
  object: 'pre_order_rest_api',
  problemStatement: 'The product needs a governed pre-order lifecycle across dependent services.',
  desiredOutcome: 'A reviewable API contract and implementation with verified failure behavior.',
  scope: [
    {
      id: ids.scope,
      title: 'Pre-order lifecycle endpoints',
      description: 'Create, read, confirm, and cancel a pre-order.',
    },
  ],
  outOfScope: [
    {
      id: ids.outOfScope,
      title: 'Payment provider replacement',
      description: 'Use the existing payment integration.',
    },
  ],
  deliverables: [
    {
      id: ids.deliverable,
      title: 'Versioned API design and implementation',
      description: 'OpenAPI, ADR, implementation, and integration tests.',
      expectedFormat: 'OpenAPI 3.1 + source changes',
      expectedLocation: 'Suar evidence manifest',
    },
  ],
  acceptanceCriteria: [
    {
      id: ids.criterion,
      statement: 'Lifecycle, error, and idempotency flows pass integration verification.',
      verificationMethod: 'code_review_and_integration_test',
      critical: true,
    },
  ],
  qualityRequirements: [
    {
      id: ids.quality,
      title: 'Idempotency',
      description: 'Duplicate commands must not create duplicate pre-orders.',
    },
  ],
  constraints: [
    {
      id: ids.constraint,
      title: 'Existing integrations',
      description: 'Do not break inventory or payment contracts.',
    },
  ],
  dependencies: [
    {
      id: ids.dependency,
      title: 'Inventory reservation contract',
      description: 'The current reservation API remains available.',
      ownerId: null,
      state: 'available',
    },
  ],
  roleInTask: 'Backend engineer',
  ownershipLevel: 'primary_owner',
  autonomyLevel: 'independent',
  collaborationType: 'cross_functional',
  environment: 'staging',
  complexityContext: { novelty: 'new domain lifecycle', risk: 'cross-service consistency' },
  impactScope: { systemArea: 'order-management', expectedImpact: 'new pre-order capability' },
  estimatedUsersAffected: 25_000,
  dueAt: '2026-08-15T17:00:00.000Z',
} as const satisfies TaskWorkContractV1)

export const TASK_EVIDENCE_CONTRACT_V1_FIXTURE = Object.freeze({
  mode: 'evidence_enabled',
  requirements: [
    {
      id: ids.evidenceRequirement,
      type: 'design_and_implementation_package',
      title: 'API proof package',
      description: 'OpenAPI diff, ADR, implementation PR, and passing integration report.',
      criterionIds: [ids.criterion],
      deliverableIds: [ids.deliverable],
      required: true,
      privacyClassification: 'internal',
    },
  ],
  verificationMethods: ['code_review', 'integration_test'],
  verifierPolicy: {
    reviewerIds: [ids.reviewer],
    reviewerRoleCodes: ['backend_lead'],
    minimumReviewers: 1,
    disallowSelfReview: true,
  },
  capabilities: [
    {
      id: ids.capabilityRequirement,
      capabilityId: ids.capability,
      capabilityName: 'API design',
      minimumLevel: 4,
      targetLevel: 6,
      assessmentCeiling: 7,
      rubricVersionId: ids.rubricVersion,
      observableBehaviours: [
        'Defines explicit lifecycle and error semantics',
        'Justifies idempotency decisions',
      ],
    },
  ],
  profileEligibility: true,
  privacyClassification: 'internal',
} as const satisfies TaskEvidenceContractV1)

export const RESOLVED_TASK_CONTRACT_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.resolvedTaskContract,
  taskId: ids.task,
  versionId: ids.contract,
  title: 'Design and implement the pre-order module API',
  specification: {
    versionId: ids.specification,
    richContent: TASK_SPECIFICATION_VERSION_V1_FIXTURE.richContent,
    plainText: TASK_SPECIFICATION_VERSION_V1_FIXTURE.plainTextProjection,
    sections: TASK_SPECIFICATION_VERSION_V1_FIXTURE.sectionIndex,
  },
  work: TASK_WORK_CONTRACT_V1_FIXTURE,
  evidence: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  supportingReferences: [
    {
      id: ids.supportingReference,
      type: 'url',
      uri: 'https://docs.example.test/pre-order-api',
      title: 'Original feature documentation',
      relevantSection: 'API lifecycle and failure cases',
      relation: 'requirement_source',
      accessState: 'authenticated',
      privacyClassification: 'internal',
      externalVersion: 'doc-v7',
      externalContentHash: hash('4'),
      addedBy: ids.creator,
      addedAt: at,
    },
  ],
  inheritedFrom: {
    projectContextVersionId: ids.projectContext,
    workPackageVersionId: ids.workPackageVersion,
  },
  readiness: {
    policyVersion: 'tva-readiness-v1',
    workState: 'ready_to_assign',
    evidenceState: 'evidence_ready',
    assignmentReady: true,
    evidenceReady: true,
    blockers: [],
    warnings: [],
    assessedAt: at,
  },
  resolvedContentHash: hash('5'),
} as const satisfies ResolvedTaskContractV1)

export const TASK_CONTRACT_VERSION_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.taskContractVersion,
  id: ids.contract,
  taskId: ids.task,
  taskSpecificationVersionId: ids.specification,
  versionNumber: 1,
  workContract: TASK_WORK_CONTRACT_V1_FIXTURE,
  evidenceContract: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  resolvedContract: RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  readinessState: 'ready_to_assign',
  creatorConfirmedBy: ids.creator,
  creatorConfirmedAt: at,
  contentHash: hash('6'),
  changeClass: 'initial',
  changeReason: 'Initial Work and Evidence Contract',
  effectiveFrom: at,
  createdAt: at,
} as const satisfies TaskContractVersionV1)

export const TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.taskAssignmentSnapshot,
  id: ids.snapshot,
  assignmentId: ids.assignment,
  taskId: ids.task,
  organizationId: ids.organization,
  projectId: ids.project,
  assigneeId: ids.assignee,
  assignedBy: ids.creator,
  roleInTask: 'Backend engineer',
  ownershipLevel: 'primary_owner',
  resolvedContract: RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  provenance: {
    projectContextVersionId: ids.projectContext,
    workPackageVersionId: ids.workPackageVersion,
    taskSpecificationVersionId: ids.specification,
    taskContractVersionId: ids.contract,
    capabilityRubricVersionIds: [ids.rubricVersion],
  },
  readinessFindingCodesResolved: ['TVA.CREATOR_CONFIRMED'],
  creatorConfirmation: {
    confirmedBy: ids.creator,
    confirmedAt: at,
  },
  acknowledgementRequired: true,
  snapshotHash: hash('7'),
  createdAt: at,
} as const satisfies TaskAssignmentSnapshotV1)

export const COMPLETION_CLAIM_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.completionClaim,
  id: ids.completionClaim,
  completionReportId: ids.completionReport,
  completionReportRevision: 1,
  completionReportHash: hash('8'),
  assignmentSnapshotId: ids.snapshot,
  taskContractVersionId: ids.contract,
  userId: ids.assignee,
  action: 'designed_and_implemented',
  object: 'pre_order_rest_api',
  proposedTitle: 'Designed and implemented the pre-order module API',
  proposedStatement:
    'Designed and implemented the pre-order API lifecycle, error contract, and idempotency behavior.',
  actualRole: 'Backend engineer',
  actualOwnership: 'primary_owner',
  actualAutonomy: 'independent',
  contributionStatement: 'Owned API design, implementation, and integration verification.',
  deliverableRefs: [ids.deliverable],
  criterionResultRefs: [ids.criterionResult],
  evidenceRefs: [ids.evidenceItem],
  outcomeData: { criteriaMet: 1, integrationSuite: 'passed' },
  publicClaimDraft: 'Designed and implemented a pre-order lifecycle API.',
  privacyClassification: 'internal',
  status: 'candidate',
  createdAt: at,
} as const satisfies CompletionClaimV1)

export const REVIEW_OBSERVATION_V1_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.reviewObservation,
  id: ids.reviewObservation,
  reviewWorkflowId: ids.reviewWorkflow,
  reviewSessionId: ids.reviewSession,
  reviewRevision: 1,
  reviewPolicyVersion: 'review-policy-2026-08-v1',
  capabilityTaxonomyVersion: 'capability-taxonomy-v6',
  assignmentSnapshotId: ids.snapshot,
  sourceSnapshotHash: TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE.snapshotHash,
  taskAssignmentId: ids.assignment,
  subjectUserId: ids.assignee,
  observationType: 'accomplishment_claim',
  targetRef: ids.completionClaim,
  disposition: 'confirm',
  structuredValue: {
    verifiedAction: 'designed_and_implemented',
    verifiedOwnership: 'primary_owner',
  },
  rationale: 'The design and implementation evidence supports the scoped claim.',
  evidenceRefs: [ids.evidenceItem],
  reviewerId: ids.reviewer,
  reviewerType: 'backend_lead',
  confidence: 0.9,
  assessmentCeiling: 7,
  governanceState: 'final',
  supersedesObservationId: null,
  createdAt: at,
  finalizedAt: at,
} as const satisfies ReviewObservationV1)

export const LEGACY_TASK_SUBMISSION_FIXTURE = Object.freeze({
  schemaVersion: TVA_SCHEMA_VERSIONS.legacyTaskSubmission,
  submissionId: ids.legacySubmission,
  taskId: ids.task,
  userId: ids.assignee,
  summary: 'Legacy submission summary without locked Work/Evidence Contract provenance.',
  implementationNotes: 'Implemented the requested API changes.',
  limitations: null,
  testNotes: 'Legacy test notes.',
  submittedAt: at,
  provenanceClass: 'legacy_unverified',
} as const satisfies LegacyTaskSubmissionV1)
