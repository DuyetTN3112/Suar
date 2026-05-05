import type { AccomplishmentPublicProjectionV1 } from '#modules/accomplishments/public_contracts/publication/accomplishment_public_projection_v1'
import type { VerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'

export const ACCOMPLISHMENT_TEST_IDS = {
  accomplishment: '00000000-0000-4000-8000-000000000001',
  user: '00000000-0000-4000-8000-000000000002',
  organization: '00000000-0000-4000-8000-000000000003',
  project: '00000000-0000-4000-8000-000000000004',
  task: '00000000-0000-4000-8000-000000000005',
  taskAssignment: '00000000-0000-4000-8000-000000000006',
  projectContextVersion: '00000000-0000-4000-8000-000000000007',
  workPackageVersion: '00000000-0000-4000-8000-000000000008',
  taskSpecificationVersion: '00000000-0000-4000-8000-000000000009',
  taskContractVersion: '00000000-0000-4000-8000-000000000010',
  assignmentSnapshot: '00000000-0000-4000-8000-000000000011',
  completionReport: '00000000-0000-4000-8000-000000000012',
  completionClaim: '00000000-0000-4000-8000-000000000013',
  reviewWorkflow: '00000000-0000-4000-8000-000000000014',
  reviewObservation: '00000000-0000-4000-8000-000000000015',
  reviewer: '00000000-0000-4000-8000-000000000016',
  evidence: '00000000-0000-4000-8000-000000000017',
  capability: '00000000-0000-4000-8000-000000000018',
  capabilitySignal: '00000000-0000-4000-8000-000000000019',
  lifecycleRevision: '00000000-0000-4000-8000-000000000020',
  sourceFact: '00000000-0000-4000-8000-000000000021',
  publicProjection: '00000000-0000-4000-8000-000000000022',
} as const

export const ACCOMPLISHMENT_TEST_HASHES = {
  specification: `sha256:${'1'.repeat(64)}`,
  contract: `sha256:${'2'.repeat(64)}`,
  assignment: `sha256:${'3'.repeat(64)}`,
  completion: `sha256:${'4'.repeat(64)}`,
  review: `sha256:${'5'.repeat(64)}`,
  canonical: `sha256:${'6'.repeat(64)}`,
  sourceFact: `sha256:${'7'.repeat(64)}`,
} as const

export function validVerifiedWorkAccomplishmentV1(): VerifiedWorkAccomplishmentV1 {
  const ids = ACCOMPLISHMENT_TEST_IDS
  const hashes = ACCOMPLISHMENT_TEST_HASHES

  return {
    contractVersion: 1 as const,
    id: ids.accomplishment,
    userId: ids.user,
    organizationId: ids.organization,
    projectId: ids.project,
    taskId: ids.task,
    taskAssignmentId: ids.taskAssignment,
    title: 'Designed and implemented the pre-order module API',
    conciseStatement:
      'Designed and implemented an idempotent pre-order API and its domain contract.',
    detailedStatement:
      'Owned the API design and implementation across inventory reservation and payment integration.',
    action: 'design_and_implement',
    object: 'pre_order_api',
    taskType: 'feature_development',
    businessDomain: 'commerce',
    problemCategory: 'api_design',
    role: 'backend_engineer',
    ownershipLevel: 'primary_owner',
    autonomyLevel: 'independent',
    collaborationType: 'cross_functional',
    context: {
      businessContext: 'Pre-order order lifecycle',
      systemArea: 'order_service',
      environment: 'production',
      scaleSummary: 'Multi-service transaction flow',
      constraints: ['inventory reservation consistency', 'payment callback idempotency'],
    },
    complexity: {
      summary: 'Cross-service consistency and idempotency design',
      factors: ['distributed transaction boundaries', 'failure recovery'],
      novelty: 'new_domain_flow',
      risk: 'high',
    },
    deliverables: [
      {
        deliverableRef: 'openapi-spec',
        title: 'OpenAPI specification',
        kind: 'design_specification',
        summary: 'Versioned API contract for pre-order operations.',
      },
    ],
    outcomes: [
      {
        outcomeRef: 'acceptance-result',
        statement: 'All acceptance and idempotency scenarios passed.',
        result: 'met',
        explanation: 'All twelve governed acceptance scenarios passed.',
        metricName: 'acceptance_scenarios_passed',
        metricValue: '12',
        metricUnit: 'scenarios',
        observedAt: '2026-07-30T10:00:00.000Z',
      },
    ],
    reportedOutcomeData: { acceptanceScenariosPassed: 12 },
    keyDecisions: ['Use idempotency keys at the payment callback boundary.'],
    technology: ['AdonisJS', 'PostgreSQL', 'OpenAPI'],
    verification: {
      status: 'verified',
      method: 'design_and_code_review',
      confidenceScore: 0.92,
      confidenceBand: 'high',
      evidenceSufficiency: 'adequate',
      reviewerReferences: [
        {
          reviewerId: ids.reviewer,
          reviewerRole: 'backend_lead',
        },
      ],
      verifiedAt: '2026-07-31T10:00:00.000Z',
    },
    evidenceReferences: [
      {
        evidenceId: ids.evidence,
        evidenceType: 'design_specification',
        accessClassification: 'confidential',
        availability: 'available',
        contentHash: hashes.sourceFact,
      },
    ],
    capabilitySignalIds: [ids.capabilitySignal],
    lifecycleState: 'verified',
    visibility: 'internal',
    provenance: {
      provenanceClass: 'native_prework',
      projectContextVersionId: ids.projectContextVersion,
      workPackageVersionId: ids.workPackageVersion,
      taskSpecificationVersionId: ids.taskSpecificationVersion,
      taskContractVersionId: ids.taskContractVersion,
      assignmentSnapshotId: ids.assignmentSnapshot,
      completionReportId: ids.completionReport,
      completionClaimIds: [ids.completionClaim],
      reviewWorkflowId: ids.reviewWorkflow,
      reviewObservationIds: [ids.reviewObservation],
      sourceHashes: {
        taskSpecification: hashes.specification,
        taskContract: hashes.contract,
        assignmentSnapshot: hashes.assignment,
        completionReport: hashes.completion,
        review: hashes.review,
      },
      policyVersion: 'accomplishment-policy-v1',
      reconstruction: null,
    },
    canonicalHash: hashes.canonical,
    createdAt: '2026-07-31T10:00:00.000Z',
    updatedAt: '2026-07-31T10:00:00.000Z',
  }
}

export function validCapabilitySignalV1() {
  const ids = ACCOMPLISHMENT_TEST_IDS

  return {
    contractVersion: 1 as const,
    id: ids.capabilitySignal,
    accomplishmentId: ids.accomplishment,
    subjectUserId: ids.user,
    capabilityId: ids.capability,
    observedBehaviour: 'Designed idempotent API boundaries and failure handling.',
    observedLevelCode: 'l7',
    assessmentCeilingCode: 'l8',
    direction: 'positive',
    applicability: 'direct',
    context: {
      action: 'design_and_implement',
      object: 'pre_order_api',
      ownershipLevel: 'primary_owner',
      complexitySummary: 'Cross-service consistency design',
    },
    evidenceReferences: [ids.evidence],
    reviewObservationIds: [ids.reviewObservation],
    confidenceScore: 0.9,
    confidenceBand: 'high',
    signalState: 'active',
    policyVersion: 'capability-signal-policy-v1',
    observedAt: '2026-07-31T10:00:00.000Z',
  }
}

export function validAccomplishmentLifecycleRevisionV1() {
  const ids = ACCOMPLISHMENT_TEST_IDS

  return {
    contractVersion: 1 as const,
    id: ids.lifecycleRevision,
    accomplishmentId: ids.accomplishment,
    sequence: 3,
    previousState: 'under_review',
    nextState: 'verified',
    visibility: 'internal',
    reasonCode: 'verification_completed',
    sourceFact: {
      id: ids.sourceFact,
      type: 'review_finalized',
      hash: ACCOMPLISHMENT_TEST_HASHES.sourceFact,
    },
    actor: {
      type: 'user',
      userId: ids.reviewer,
    },
    policyVersion: 'accomplishment-policy-v1',
    supersedesRevisionId: null,
    relatedAccomplishmentId: null,
    occurredAt: '2026-07-31T10:00:00.000Z',
  }
}

export function validAccomplishmentPublicProjectionV1(): AccomplishmentPublicProjectionV1 {
  const ids = ACCOMPLISHMENT_TEST_IDS

  return {
    contractVersion: 1 as const,
    id: ids.publicProjection,
    accomplishmentId: ids.accomplishment,
    userId: ids.user,
    publicationVersion: 1,
    sourceLifecycleRevisionId: ids.lifecycleRevision,
    sourceCanonicalHash: ACCOMPLISHMENT_TEST_HASHES.canonical,
    title: 'Designed and implemented a pre-order module API',
    conciseStatement:
      'Designed and implemented an idempotent pre-order API for a multi-service order flow.',
    action: 'design_and_implement',
    object: 'pre_order_api',
    taskType: 'feature_development',
    businessDomain: 'commerce',
    problemCategory: 'api_design',
    role: 'backend_engineer',
    ownershipLevel: 'primary_owner',
    autonomyLevel: 'independent',
    collaborationType: 'cross_functional',
    context: {
      environment: 'production',
      systemArea: 'order_workflow',
      scaleSummary: 'Multi-service transaction flow',
    },
    deliverableSummaries: ['OpenAPI specification', 'Implementation and integration tests'],
    outcomeSummaries: ['Acceptance and idempotency scenarios verified'],
    technology: ['AdonisJS', 'PostgreSQL', 'OpenAPI'],
    capabilities: [
      {
        capabilityId: ids.capability,
        label: 'API design',
        confidenceBand: 'high',
      },
    ],
    verification: {
      status: 'verified',
      methodLabel: 'Design and code review',
      confidenceBand: 'high',
      reviewerRoleLabels: ['Backend Lead'],
      verifiedAt: '2026-07-31T10:00:00.000Z',
      evidenceAvailability: 'not_disclosed',
      provenanceClass: 'native_prework',
    },
    disclosure: {
      redactionState: 'generalized',
      disclosurePolicyVersion: 'public-disclosure-v1',
      organizationLabel: null,
      projectLabel: null,
    },
    publishedAt: '2026-08-01T10:00:00.000Z',
    sourceUpdatedAt: '2026-07-31T10:00:00.000Z',
  }
}
