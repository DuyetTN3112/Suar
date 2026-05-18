import { test } from '@japa/runner'

import {
  CAPABILITY_SIGNAL_PROJECTION_CODES,
  projectGovernedCapabilitySignals,
  type CapabilitySignalProjectionInput,
  type GovernedCapabilityObservationSource,
} from '#modules/accomplishments/domain/verified-work/capability_signal_projection_rules'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import type { ReviewObservationV1 } from '#modules/reviews/public_contracts/observation/completion_review_contracts'

const IDS = {
  accomplishment: '30000000-0000-4000-8000-000000000001',
  assignment: '30000000-0000-4000-8000-000000000002',
  snapshot: '30000000-0000-4000-8000-000000000003',
  subject: '30000000-0000-4000-8000-000000000004',
  workflow: '30000000-0000-4000-8000-000000000005',
  session: '30000000-0000-4000-8000-000000000006',
  reviewer: '30000000-0000-4000-8000-000000000007',
  observation: '30000000-0000-4000-8000-000000000008',
  secondObservation: '30000000-0000-4000-8000-000000000009',
  capability: '30000000-0000-4000-8000-000000000010',
  secondCapability: '30000000-0000-4000-8000-000000000011',
  evidenceA: '30000000-0000-4000-8000-000000000012',
  evidenceB: '30000000-0000-4000-8000-000000000013',
} as const

const HASHES = {
  snapshot: `sha256:${'1'.repeat(64)}`,
  observation: `sha256:${'2'.repeat(64)}`,
  secondObservation: `sha256:${'3'.repeat(64)}`,
  evidenceA: `sha256:${'4'.repeat(64)}`,
  evidenceB: `sha256:${'5'.repeat(64)}`,
} as const

const hasher = new NodeAccomplishmentContentHasher()

function observation(overrides: Partial<ReviewObservationV1> = {}): ReviewObservationV1 {
  return {
    schemaVersion: 'suar.review_observation.v1',
    id: IDS.observation,
    reviewWorkflowId: IDS.workflow,
    reviewSessionId: IDS.session,
    reviewRevision: 3,
    reviewPolicyVersion: 'review-policy-2026.08',
    capabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
    assignmentSnapshotId: IDS.snapshot,
    sourceSnapshotHash: HASHES.snapshot,
    taskAssignmentId: IDS.assignment,
    subjectUserId: IDS.subject,
    observationType: 'capability',
    targetRef: IDS.capability,
    disposition: 'confirm',
    structuredValue: {
      capabilityId: IDS.capability,
      observedBehaviour: 'Designed failure-safe API boundaries from verified implementation evidence.',
      observedLevel: 9,
      targetLevel: 10,
      direction: 'positive',
      applicability: 'direct',
      complexitySummary: 'Cross-service idempotency and consistency constraints',
    },
    rationale: 'The bounded evidence demonstrates the observed behaviour.',
    evidenceRefs: [IDS.evidenceB, IDS.evidenceA],
    reviewerId: IDS.reviewer,
    reviewerType: 'human',
    confidence: 0.91,
    assessmentCeiling: 8,
    governanceState: 'final',
    supersedesObservationId: null,
    createdAt: '2026-08-01T09:00:00.000Z',
    finalizedAt: '2026-08-01T09:05:00.000Z',
    ...overrides,
  }
}

function source(
  overrides: Partial<GovernedCapabilityObservationSource> = {}
): GovernedCapabilityObservationSource {
  return {
    observation: observation(),
    revisionHash: HASHES.observation,
    authorizedAssessmentCeiling: 7,
    evidence: [
      {
        id: IDS.evidenceB,
        contentHash: HASHES.evidenceB,
        accessState: 'available',
        verificationStrength: 'strong',
      },
      {
        id: IDS.evidenceA,
        contentHash: HASHES.evidenceA,
        accessState: 'available',
        verificationStrength: 'moderate',
      },
    ],
    ...overrides,
  }
}

function input(overrides: Partial<CapabilitySignalProjectionInput> = {}): CapabilitySignalProjectionInput {
  return {
    accomplishment: {
      id: IDS.accomplishment,
      subjectUserId: IDS.subject,
      taskAssignmentId: IDS.assignment,
      assignmentSnapshotId: IDS.snapshot,
      assignmentSnapshotHash: HASHES.snapshot,
      evidence: source().evidence.map(({ id, contentHash, accessState }) => ({
        id,
        contentHash,
        accessState,
      })),
      gate: {
        allowed: true,
        blockerCodes: [],
        lifecycleState: 'verified',
        action: 'design',
        object: 'pre-order-api',
        ownershipLevel: 'primary_owner',
        deliverableIds: [],
        criterionResultIds: [],
        evidenceIds: [IDS.evidenceA, IDS.evidenceB],
        reviewObservationIds: [],
        reviewObservationHashes: [],
        reviewerReferences: [],
      },
    },
    expectedReviewPolicyVersion: 'review-policy-2026.08',
    expectedCapabilityTaxonomyVersion: 'capability-taxonomy-2026.08',
    signalPolicyVersion: 'capability-signal-policy-2026.08',
    levelScale: Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      code: `l${index + 1}`,
    })),
    observations: [source()],
    ...overrides,
  }
}

test.group('Unit | Governed capability signal projection', () => {
  test('pins governed provenance and caps observed level without copying task target level', ({
    assert,
  }) => {
    const result = projectGovernedCapabilitySignals(input(), hasher)

    assert.isTrue(result.allowed)
    if (!result.allowed) return

    const projected = result.signals[0]
    assert.exists(projected)
    if (!projected) return
    assert.match(projected.projectionKey, /^acs:v1:[a-f0-9]{64}$/)
    assert.match(projected.signal.id, /^[0-9a-f-]{36}$/)
    assert.equal(projected.signal.observedLevelCode, 'l7')
    assert.equal(projected.signal.assessmentCeilingCode, 'l7')
    assert.equal(projected.signal.context.action, 'design')
    assert.equal(projected.signal.context.object, 'pre-order-api')
    assert.equal(projected.signal.context.ownershipLevel, 'primary_owner')
    assert.equal(projected.signal.confidenceScore, 0.91)
    assert.equal(projected.signal.confidenceBand, 'high')
    assert.deepEqual(projected.signal.evidenceReferences, [IDS.evidenceA, IDS.evidenceB])
    assert.deepEqual(projected.signal.reviewObservationIds, [IDS.observation])
    assert.equal(projected.provenance.observation.revisionHash, HASHES.observation)
    assert.equal(projected.provenance.observation.reviewPolicyVersion, 'review-policy-2026.08')
    assert.equal(
      projected.provenance.taxonomy.version,
      'capability-taxonomy-2026.08'
    )
    assert.equal(projected.provenance.assessment.observationCeiling, 8)
    assert.equal(projected.provenance.assessment.authorizedCeiling, 7)
    assert.equal(projected.provenance.assessment.observedLevel, 9)
    assert.equal(projected.provenance.assessment.effectiveObservedLevel, 7)
    assert.equal(projected.provenance.signalPolicyVersion, 'capability-signal-policy-2026.08')
    assert.notProperty(projected.signal, 'targetLevel')
    assert.notProperty(projected.provenance.assessment, 'targetLevel')
  })

  test('is deterministic across evidence and observation input order', ({ assert }) => {
    const evidenceA = source().evidence[1]
    assert.exists(evidenceA)
    if (!evidenceA) return
    const second = source({
      observation: observation({
        id: IDS.secondObservation,
        targetRef: IDS.secondCapability,
        structuredValue: {
          capabilityId: IDS.secondCapability,
          observedBehaviour: 'Debugged a bounded production failure.',
          observedLevel: 6,
          direction: 'positive',
          applicability: 'supporting',
          complexitySummary: null,
        },
        evidenceRefs: [IDS.evidenceA],
      }),
      revisionHash: HASHES.secondObservation,
      evidence: [evidenceA],
    })
    const first = projectGovernedCapabilitySignals(
      input({ observations: [source(), second] }),
      hasher
    )
    const permuted = projectGovernedCapabilitySignals(
      input({
        observations: [
          second,
          source({
            evidence: [...source().evidence].reverse(),
            observation: observation({ evidenceRefs: [IDS.evidenceA, IDS.evidenceB] }),
          }),
        ],
      }),
      hasher
    )

    assert.isTrue(first.allowed)
    assert.isTrue(permuted.allowed)
    if (!first.allowed || !permuted.allowed) return
    assert.deepEqual(first.signals, permuted.signals)
    assert.deepEqual(
      first.signals.map(({ projectionKey }) => projectionKey),
      first.signals.map(({ projectionKey }) => projectionKey).sort()
    )
  })

  test('blocks a failed boundary and draft, AI-final or disputed observations', ({ assert }) => {
    const failedBoundary = projectGovernedCapabilitySignals(
      input({
        accomplishment: {
          ...input().accomplishment,
          gate: { allowed: false, blockerCodes: [] },
        },
      }),
      hasher
    )
    assert.include(
      failedBoundary.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.accomplishmentGateNotPassed
    )

    for (const invalid of [
      observation({ governanceState: 'draft', finalizedAt: null }),
      observation({ reviewerType: 'ai_assistant' }),
      observation({ governanceState: 'disputed' }),
    ]) {
      const result = projectGovernedCapabilitySignals(
        input({ observations: [source({ observation: invalid })] }),
        hasher
      )
      assert.isFalse(result.allowed)
      assert.include(
        result.blockerCodes,
        CAPABILITY_SIGNAL_PROJECTION_CODES.finalHumanGovernedObservationRequired
      )
    }
  })

  test('blocks inaccessible evidence and any foreign subject or snapshot provenance', ({ assert }) => {
    const inaccessible = projectGovernedCapabilitySignals(
      input({
        observations: [
          source({
            evidence: source().evidence.map((fact, index) =>
              index === 0 ? { ...fact, accessState: 'restricted' } : fact
            ),
          }),
        ],
      }),
      hasher
    )
    assert.include(
      inaccessible.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceUnavailable
    )

    for (const foreign of [
      observation({ subjectUserId: '30000000-0000-4000-8000-000000000099' }),
      observation({ assignmentSnapshotId: '30000000-0000-4000-8000-000000000098' }),
      observation({ sourceSnapshotHash: `sha256:${'f'.repeat(64)}` }),
    ]) {
      const result = projectGovernedCapabilitySignals(
        input({ observations: [source({ observation: foreign })] }),
        hasher
      )
      assert.include(
        result.blockerCodes,
        CAPABILITY_SIGNAL_PROJECTION_CODES.provenanceMismatch
      )
    }
  })

  test('blocks forged evidence, taxonomy and review policy provenance', ({ assert }) => {
    const evidenceB = source().evidence[0]
    assert.exists(evidenceB)
    if (!evidenceB) return
    const evidence = projectGovernedCapabilitySignals(
      input({
        observations: [source({ evidence: [evidenceB] })],
      }),
      hasher
    )
    assert.include(
      evidence.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceMismatch
    )

    const taxonomy = projectGovernedCapabilitySignals(
      input({
        observations: [
          source({
            observation: observation({
              capabilityTaxonomyVersion: 'capability-taxonomy-foreign',
            }),
          }),
        ],
      }),
      hasher
    )
    assert.include(
      taxonomy.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.taxonomyMismatch
    )

    const policy = projectGovernedCapabilitySignals(
      input({
        observations: [
          source({
            observation: observation({ reviewPolicyVersion: 'review-policy-foreign' }),
          }),
        ],
      }),
      hasher
    )
    assert.include(policy.blockerCodes, CAPABILITY_SIGNAL_PROJECTION_CODES.policyMismatch)
  })

  test('pins capability evidence hash and access state to the governed completion report facts', ({
    assert,
  }) => {
    const governedEvidence = source().evidence.map(({ id, contentHash, accessState }) => ({
      id,
      contentHash,
      accessState,
    }))
    const forgedHashInput: CapabilitySignalProjectionInput = {
      ...input(),
      accomplishment: {
        ...input().accomplishment,
        evidence: governedEvidence,
      },
      observations: [
        source({
          evidence: source().evidence.map((fact, index) =>
            index === 0
              ? { ...fact, contentHash: `sha256:${'f'.repeat(64)}` as const }
              : fact
          ),
        }),
      ],
    }
    const forgedHash = projectGovernedCapabilitySignals(forgedHashInput, hasher)

    assert.isFalse(forgedHash.allowed)
    assert.include(
      forgedHash.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceMismatch
    )

    const forgedAccessInput: CapabilitySignalProjectionInput = {
      ...input(),
      accomplishment: {
        ...input().accomplishment,
        evidence: governedEvidence.map((fact, index) =>
          index === 0 ? { ...fact, accessState: 'unavailable' as const } : fact
        ),
      },
    }
    const forgedAccess = projectGovernedCapabilitySignals(forgedAccessInput, hasher)

    assert.isFalse(forgedAccess.allowed)
    assert.include(
      forgedAccess.blockerCodes,
      CAPABILITY_SIGNAL_PROJECTION_CODES.evidenceUnavailable
    )
  })

  test('changes signal identity when the governed level-code scale changes', ({ assert }) => {
    const first = projectGovernedCapabilitySignals(input(), hasher)
    const remapped = projectGovernedCapabilitySignals(
      input({
        levelScale: Array.from({ length: 10 }, (_, index) => ({
          level: index + 1,
          code: `career_level_${index + 1}`,
        })),
      }),
      hasher
    )

    assert.isTrue(first.allowed)
    assert.isTrue(remapped.allowed)
    if (!first.allowed || !remapped.allowed) return
    assert.notEqual(first.signals[0]?.projectionKey, remapped.signals[0]?.projectionKey)
    assert.notEqual(first.signals[0]?.signal.id, remapped.signals[0]?.signal.id)
  })
})
