import { test } from '@japa/runner'

import {
  assessTaskReadiness,
  type TaskReadinessAssessmentInput,
} from '#modules/tasks/domain/task-authoring/task_readiness_kernel'
import {
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
  TASK_WORK_CONTRACT_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { TaskEvidenceContractV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import { isResolvedTaskContractV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

const ASSIGNEE_ID = '00000000-0000-4000-8000-000000000012'
const ASSESSED_AT = '2026-08-01T08:00:00.000Z'

function readyInput(): TaskReadinessAssessmentInput {
  return {
    policyVersion: 'tva-readiness-v1',
    assessedAt: ASSESSED_AT,
    specification: {
      plainText: RESOLVED_TASK_CONTRACT_V1_FIXTURE.specification.plainText,
      sections: [...RESOLVED_TASK_CONTRACT_V1_FIXTURE.specification.sections],
    },
    work: TASK_WORK_CONTRACT_V1_FIXTURE,
    evidence: TASK_EVIDENCE_CONTRACT_V1_FIXTURE,
    supportingReferences: [...RESOLVED_TASK_CONTRACT_V1_FIXTURE.supportingReferences],
    creatorConfirmed: true,
    assigneeId: ASSIGNEE_ID,
    declarations: {
      constraintsAddressed: true,
      dependenciesAddressed: true,
    },
    snapshotCapabilityAvailable: true,
    inheritedFindings: [],
  }
}

function evidenceOf(input: TaskReadinessAssessmentInput): TaskEvidenceContractV1 {
  if (!input.evidence) {
    throw new TypeError('Test fixture must include an Evidence Contract')
  }
  return input.evidence
}

test.group('Unit | Deterministic task readiness kernel', () => {
  test('returns independently ready work and evidence states for a complete confirmed contract', ({
    assert,
  }) => {
    const result = assessTaskReadiness(readyInput())

    assert.equal(result.policyVersion, 'tva-readiness-v1')
    assert.equal(result.workState, 'ready_to_assign')
    assert.equal(result.evidenceState, 'evidence_ready')
    assert.isTrue(result.assignmentReady)
    assert.isTrue(result.evidenceReady)
    assert.deepEqual(result.blockers, [])
    assert.equal(result.assessedAt, ASSESSED_AT)
  })

  test('table-drives every critical work blocker without consulting delivery status', ({
    assert,
  }) => {
    const scenarios: Array<{
      code: string
      build: (input: TaskReadinessAssessmentInput) => TaskReadinessAssessmentInput
    }> = [
      {
        code: 'TVA.WORK.ACTION_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, action: 'TBD' } }),
      },
      {
        code: 'TVA.WORK.OBJECT_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, object: '  ' } }),
      },
      {
        code: 'TVA.WORK.PROBLEM_STATEMENT_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, problemStatement: 'TODO' } }),
      },
      {
        code: 'TVA.WORK.OUTCOME_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, desiredOutcome: 'xem docs' } }),
      },
      {
        code: 'TVA.WORK.SCOPE_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, scope: [] } }),
      },
      {
        code: 'TVA.WORK.DELIVERABLE_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, deliverables: [] } }),
      },
      {
        code: 'TVA.WORK.QUALITY_REQUIREMENT_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, qualityRequirements: [] } }),
      },
      {
        code: 'TVA.WORK.ACCEPTANCE_CRITERION_MISSING',
        build: (input) => ({ ...input, work: { ...input.work, acceptanceCriteria: [] } }),
      },
      {
        code: 'TVA.WORK.CREATOR_CONFIRMATION_MISSING',
        build: (input) => ({ ...input, creatorConfirmed: false }),
      },
    ]

    for (const scenario of scenarios) {
      const result = assessTaskReadiness(scenario.build(readyInput()))
      assert.include(
        result.blockers.map((finding) => finding.code),
        scenario.code
      )
      assert.isFalse(result.assignmentReady, scenario.code)
      assert.equal(result.workState, 'needs_clarification', scenario.code)
      assert.isFalse(result.evidenceReady, scenario.code)
      assert.equal(result.evidenceState, 'needs_clarification', scenario.code)
    }
  })

  test('allows publishing without an assignee while keeping assignment readiness false', ({ assert }) => {
    const result = assessTaskReadiness({ ...readyInput(), assigneeId: null })

    assert.isTrue(result.evidenceReady)
    assert.isFalse(result.assignmentReady)
    assert.include(result.warnings.map((finding) => finding.code), 'TVA.WORK.ASSIGNEE_MISSING')
    assert.notInclude(result.blockers.map((finding) => finding.code), 'TVA.WORK.ASSIGNEE_MISSING')
  })

  test('link-only content stays blocked for every reference access state', ({ assert }) => {
    const placeholderSamples = [
      '',
      '   ',
      'TBD',
      'TODO',
      'see docs',
      'xem tài liệu',
      'TBD '.repeat(500),
    ]
    const accessStates = [
      'available',
      'authenticated',
      'restricted',
      'unavailable',
      'unknown',
    ] as const

    for (const plainText of placeholderSamples) {
      const withoutLink = readyInput()
      const baseline = assessTaskReadiness({
        ...withoutLink,
        specification: { plainText, sections: [] },
        supportingReferences: [],
      })
      assert.isFalse(baseline.assignmentReady)

      for (const accessState of accessStates) {
        const withLink = readyInput()
        const result = assessTaskReadiness({
          ...withLink,
          specification: { plainText, sections: [] },
          supportingReferences: withLink.supportingReferences.map((reference) => ({
            ...reference,
            accessState,
          })),
        })
        assert.isFalse(result.assignmentReady, `${plainText.slice(0, 12)}:${accessState}`)
        assert.include(
          result.blockers.map((finding) => finding.code),
          'TVA.WORK.LINK_ONLY_CORE_CONTENT'
        )
        if (['restricted', 'unavailable', 'unknown'].includes(accessState)) {
          assert.include(
            result.blockers.map((finding) => finding.code),
            'TVA.WORK.CRITICAL_REFERENCE_INACCESSIBLE'
          )
        }
      }
    }
  })

  test('critical non-text sections require a text equivalent', ({ assert }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      specification: {
        ...input.specification,
        sections: input.specification.sections.map((section) => ({
          ...section,
          critical: true,
          hasTextEquivalent: false,
        })),
      },
    })

    assert.include(
      result.blockers.map((finding) => finding.code),
      'TVA.WORK.CRITICAL_NON_TEXT_WITHOUT_EQUIVALENT'
    )
    assert.isFalse(result.assignmentReady)
  })

  test('unsupported rich nodes are explicit warnings while complete accessible text remains usable', ({
    assert,
  }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      specification: {
        ...input.specification,
        richContent: {
          type: 'doc',
          content: [{ type: 'vendorCanvas', content: [] }],
        },
      },
    })

    assert.include(
      result.warnings.map((finding) => finding.code),
      'TVA.WORK.UNSUPPORTED_RICH_CONTENT_NODE'
    )
    assert.isTrue(result.assignmentReady)
  })

  test('table-drives Evidence-enabled blockers separately from assignment readiness', ({
    assert,
  }) => {
    const scenarios: Array<{
      code: string
      build: (input: TaskReadinessAssessmentInput) => TaskReadinessAssessmentInput
    }> = [
      {
        code: 'TVA.EVIDENCE.REQUIREMENT_MISSING',
        build: (input) => ({ ...input, evidence: { ...evidenceOf(input), requirements: [] } }),
      },
      {
        code: 'TVA.EVIDENCE.CRITERION_VERIFICATION_METHOD_MISSING',
        build: (input) => ({
          ...input,
          work: {
            ...input.work,
            acceptanceCriteria: input.work.acceptanceCriteria.map((criterion) => ({
              ...criterion,
              verificationMethod: 'N/A',
            })),
          },
        }),
      },
      {
        code: 'TVA.EVIDENCE.CRITERION_EVIDENCE_MAPPING_MISSING',
        build: (input) => ({
          ...input,
          evidence: {
            ...evidenceOf(input),
            requirements: evidenceOf(input).requirements.map((requirement) => ({
              ...requirement,
              criterionIds: [],
            })),
          },
        }),
      },
      {
        code: 'TVA.EVIDENCE.VERIFICATION_METHOD_MISSING',
        build: (input) => ({
          ...input,
          evidence: { ...evidenceOf(input), verificationMethods: ['TBD'] },
        }),
      },
      {
        code: 'TVA.EVIDENCE.PRIVACY_CLASSIFICATION_INVALID',
        build: (input) => ({
          ...input,
          evidence: { ...evidenceOf(input), privacyClassification: 'unknown' as 'internal' },
        }),
      },
      {
        code: 'TVA.EVIDENCE.CAPABILITY_MISSING',
        build: (input) => ({ ...input, evidence: { ...evidenceOf(input), capabilities: [] } }),
      },
      {
        code: 'TVA.EVIDENCE.OBSERVABLE_BEHAVIOUR_MISSING',
        build: (input) => ({
          ...input,
          evidence: {
            ...evidenceOf(input),
            capabilities: evidenceOf(input).capabilities.map((capability) => ({
              ...capability,
              observableBehaviours: [],
            })),
          },
        }),
      },
      {
        code: 'TVA.EVIDENCE.SNAPSHOT_CAPABILITY_MISSING',
        build: (input) => ({ ...input, snapshotCapabilityAvailable: false }),
      },
    ]

    for (const scenario of scenarios) {
      const result = assessTaskReadiness(scenario.build(readyInput()))
      assert.include(
        result.blockers.map((finding) => finding.code),
        scenario.code
      )
      assert.isTrue(result.assignmentReady, scenario.code)
      assert.isFalse(result.evidenceReady, scenario.code)
      assert.equal(result.evidenceState, 'needs_clarification', scenario.code)
    }
  })

  test('blocks publishing a task skill without a rubric or assessment ceiling', ({ assert }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      evidence: {
        ...evidenceOf(input),
        capabilities: evidenceOf(input).capabilities.map((capability) => ({
          ...capability,
          assessmentCeiling: null,
          rubricVersionId: null,
        })),
      },
    })

    assert.isFalse(result.evidenceReady)
    assert.include(result.blockers.map((finding) => finding.code), 'TVA.EVIDENCE.ASSESSMENT_CEILING_MISSING')
    assert.include(result.blockers.map((finding) => finding.code), 'TVA.EVIDENCE.RUBRIC_VERSION_MISSING')
  })

  test('allows publishing without a reviewer while recording a reviewer warning', ({ assert }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      evidence: {
        ...evidenceOf(input),
        verifierPolicy: {
          ...evidenceOf(input).verifierPolicy,
          reviewerIds: [],
          reviewerRoleCodes: [],
          minimumReviewers: 0,
        },
      },
    })

    assert.isTrue(result.evidenceReady)
    assert.notInclude(result.blockers.map((finding) => finding.code), 'TVA.EVIDENCE.REVIEWER_ROUTE_MISSING')
    assert.include(result.warnings.map((finding) => finding.code), 'TVA.EVIDENCE.REVIEWER_ROUTE_MISSING')
  })

  test('Operational-only is an explicit profile-ineligible mode, not failed evidence readiness', ({
    assert,
  }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      evidence: {
        mode: 'operational_only',
        requirements: [],
        verificationMethods: [],
        verifierPolicy: {
          reviewerIds: [],
          reviewerRoleCodes: [],
          minimumReviewers: 0,
          disallowSelfReview: true,
        },
        capabilities: [],
        profileEligibility: false,
        privacyClassification: 'internal',
      },
      snapshotCapabilityAvailable: false,
    })

    assert.isTrue(result.assignmentReady)
    assert.isFalse(result.evidenceReady)
    assert.equal(result.evidenceState, 'not_applicable')
    assert.isFalse(result.blockers.some((finding) => finding.code.startsWith('TVA.EVIDENCE.')))
  })

  test('blocks an Operational-only contract that is accidentally profile-eligible', ({
    assert,
  }) => {
    const input = readyInput()
    const result = assessTaskReadiness({
      ...input,
      evidence: {
        ...evidenceOf(input),
        mode: 'operational_only',
        requirements: [],
        verificationMethods: [],
        capabilities: [],
        profileEligibility: true,
      },
    })

    assert.include(
      result.blockers.map((finding) => finding.code),
      'TVA.EVIDENCE.OPERATIONAL_PROFILE_ELIGIBILITY_CONFLICT'
    )
    assert.isFalse(result.evidenceReady)
  })

  test('rejects duplicated criteria, N/A evidence, missing policy, and inherited blockers', ({
    assert,
  }) => {
    const input = readyInput()
    const duplicatedCriterion = input.work.acceptanceCriteria[0]
    if (!duplicatedCriterion) {
      throw new TypeError('Test fixture must include an acceptance criterion')
    }
    const result = assessTaskReadiness({
      ...input,
      policyVersion: '  ',
      work: {
        ...input.work,
        acceptanceCriteria: [
          duplicatedCriterion,
          { ...duplicatedCriterion, id: '00000000-0000-4000-8000-000000000099' },
        ],
      },
      evidence: {
        ...evidenceOf(input),
        requirements: evidenceOf(input).requirements.map((requirement) => ({
          ...requirement,
          title: 'N/A',
          description: 'TBD',
        })),
      },
      inheritedFindings: [
        {
          code: 'TVA.WORK.INHERITED_CONTEXT_CONFLICT',
          severity: 'blocker',
          fieldPath: 'inheritedFrom.projectContextVersionId',
          sourcePath: 'projectContext.constraints[0]',
          message: 'Inherited context contains an unresolved conflict.',
          remediationHint: 'Resolve or explicitly override the inherited conflict.',
        },
      ],
    })

    assert.includeMembers(
      result.blockers.map((finding) => finding.code),
      [
        'TVA.READINESS.POLICY_VERSION_MISSING',
        'TVA.WORK.DUPLICATE_ACCEPTANCE_CRITERION',
        'TVA.EVIDENCE.REQUIREMENT_CONTENT_MISSING',
        'TVA.WORK.INHERITED_CONTEXT_CONFLICT',
      ]
    )
    assert.equal(result.policyVersion, 'missing')
    assert.isFalse(result.assignmentReady)
    assert.isFalse(result.evidenceReady)
  })

  test('is byte-for-byte deterministic for canonical input and emits sorted unique findings', ({
    assert,
  }) => {
    const input = readyInput()
    const incomplete = {
      ...input,
      creatorConfirmed: false,
      assigneeId: null,
      work: { ...input.work, action: 'TBD', object: '' },
    }

    const first = assessTaskReadiness(incomplete)
    const second = assessTaskReadiness(incomplete)
    assert.deepEqual(first, second)
    assert.deepEqual(
      first.blockers.map((finding) => finding.code),
      [...first.blockers.map((finding) => finding.code)].sort()
    )
    assert.equal(new Set(first.blockers.map((finding) => finding.code)).size, first.blockers.length)
  })

  test('produces a TaskReadinessResultV1 that conforms to the locked resolved-contract fixture', ({
    assert,
  }) => {
    const readiness = assessTaskReadiness(readyInput())
    assert.isTrue(
      isResolvedTaskContractV1({
        ...RESOLVED_TASK_CONTRACT_V1_FIXTURE,
        readiness,
      })
    )
  })
})
