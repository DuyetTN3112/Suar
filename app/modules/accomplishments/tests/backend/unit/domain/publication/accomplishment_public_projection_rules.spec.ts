import { test } from '@japa/runner'

import {
  ACCOMPLISHMENT_PUBLICATION_CODES,
  deriveApprovedPublicProjectionFields,
  evaluateAccomplishmentPublicationGate,
  type AuthoritativeAccomplishmentDisclosureDecision,
  type AuthoritativeAccomplishmentPublicationConsent,
} from '#modules/accomplishments/domain/publication/accomplishment_public_projection_rules'
import { parseVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/public_contracts/verified-work/verified_work_accomplishment_v1'
import { validVerifiedWorkAccomplishmentV1 } from '#modules/accomplishments/tests/backend/unit/public_contracts/verified-work/accomplishment_contract_fixtures'

const accomplishment = parseVerifiedWorkAccomplishmentV1(validVerifiedWorkAccomplishmentV1())

const decision: AuthoritativeAccomplishmentDisclosureDecision = {
  decisionId: '10000000-0000-4000-8000-000000000001',
  decisionHash: `sha256:${'a'.repeat(64)}` as const,
  accomplishmentId: accomplishment.id,
  subjectUserId: accomplishment.userId,
  allowed: true,
  policyVersion: 'public-disclosure-v1',
  decidedAt: '2026-08-01T09:00:00.000Z',
  content: {
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
    deliverableSummaries: ['OpenAPI specification'],
    outcomeSummaries: ['All acceptance and idempotency scenarios passed.'],
    technology: ['AdonisJS', 'PostgreSQL'],
    capabilities: [
      {
        capabilityId: '10000000-0000-4000-8000-000000000002',
        label: 'API design',
        confidenceBand: 'high' as const,
      },
    ],
    verificationMethodLabel: 'Design and code review',
    reviewerRoleLabels: ['Backend Lead'],
    evidenceAvailability: 'not_disclosed' as const,
    redactionState: 'generalized' as const,
    organizationLabel: null,
    projectLabel: null,
  },
}
const consent: AuthoritativeAccomplishmentPublicationConsent = {
  consentFactId: '10000000-0000-4000-8000-000000000003',
  consentFactHash: `sha256:${'b'.repeat(64)}` as const,
  accomplishmentId: accomplishment.id,
  subjectUserId: accomplishment.userId,
  granted: true,
  sourceCanonicalHash: accomplishment.canonicalHash as `sha256:${string}`,
  sourceLifecycleRevisionId: '10000000-0000-4000-8000-000000000004',
  disclosureDecisionId: decision.decisionId,
  disclosureDecisionHash: decision.decisionHash,
  disclosurePolicyVersion: decision.policyVersion,
  consentedAt: '2026-08-01T10:00:00.000Z',
}

test.group('Unit | Accomplishment public projection rules', () => {
  test('allows only consented, governed verified sources with an authoritative allow decision', ({
    assert,
  }) => {
    const result = evaluateAccomplishmentPublicationGate({
      accomplishment,
      lifecycleState: 'verified',
      hasOpenDispute: false,
      consent,
      decision,
      allowedCapabilities: decision.content.capabilities,
    })

    assert.isTrue(result.allowed)
    assert.deepEqual(result.blockerCodes, [])
  })

  test('fails closed for missing consent, non-verifiable lifecycle, dispute and denied disclosure', ({
    assert,
  }) => {
    const result = evaluateAccomplishmentPublicationGate({
      accomplishment,
      lifecycleState: 'frozen',
      hasOpenDispute: true,
      consent: { ...consent, granted: false },
      decision: { ...decision, allowed: false },
      allowedCapabilities: decision.content.capabilities,
    })

    assert.includeMembers([...result.blockerCodes], [
      ACCOMPLISHMENT_PUBLICATION_CODES.consentRequired,
      ACCOMPLISHMENT_PUBLICATION_CODES.sourceNotVerified,
      ACCOMPLISHMENT_PUBLICATION_CODES.sourceDisputed,
      ACCOMPLISHMENT_PUBLICATION_CODES.disclosureDenied,
    ])
  })

  test('rejects a disclosure decision bound to another subject or accomplishment', ({ assert }) => {
    const result = evaluateAccomplishmentPublicationGate({
      accomplishment,
      lifecycleState: 'verified',
      hasOpenDispute: false,
      consent,
      decision: {
        ...decision,
        accomplishmentId: '10000000-0000-4000-8000-000000000099',
        subjectUserId: '10000000-0000-4000-8000-000000000098',
      },
      allowedCapabilities: decision.content.capabilities,
    })

    assert.include(result.blockerCodes, ACCOMPLISHMENT_PUBLICATION_CODES.decisionBoundaryMismatch)
  })

  test('blocks overbroad wording, structured fields and unsupported capabilities', ({ assert }) => {
    const result = evaluateAccomplishmentPublicationGate({
      accomplishment,
      lifecycleState: 'verified',
      hasOpenDispute: false,
      consent,
      decision: {
        ...decision,
        content: {
          ...decision.content,
          conciseStatement: 'Led every system and delivered the entire platform.',
          businessDomain: 'unrelated_domain',
          capabilities: [
            {
              capabilityId: '10000000-0000-4000-8000-000000000099',
              label: 'Platform leadership',
              confidenceBand: 'high',
            },
          ],
        },
      },
      allowedCapabilities: decision.content.capabilities,
    })

    assert.includeMembers([...result.blockerCodes], [
      ACCOMPLISHMENT_PUBLICATION_CODES.wordingNotCanonical,
      ACCOMPLISHMENT_PUBLICATION_CODES.fieldNotCanonical,
      ACCOMPLISHMENT_PUBLICATION_CODES.capabilityNotAllowed,
    ])
  })

  test('copies action, object and ownership from canonical work and emits only approved fields', ({
    assert,
  }) => {
    const fields = deriveApprovedPublicProjectionFields(accomplishment, decision)

    assert.equal(fields.action, accomplishment.action)
    assert.equal(fields.object, accomplishment.object)
    assert.equal(fields.ownershipLevel, accomplishment.ownershipLevel)
    assert.equal(fields.title, decision.content.title)
    assert.notProperty(fields, 'taskId')
    assert.notProperty(fields, 'organizationId')
    assert.notProperty(fields, 'reviewerReferences')
    assert.notProperty(fields, 'evidenceReferences')
    assert.notProperty(fields, 'detailedStatement')
    assert.notProperty(fields, 'keyDecisions')
  })
})
