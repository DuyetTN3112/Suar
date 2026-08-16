import { test } from '@japa/runner'

import { RESOLVED_TASK_CONTRACT_V1_FIXTURE } from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import type { ResolvedTaskContractV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import {
  classifyTaskContractChange,
  classifyTaskContractChangeV1,
  INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
  verifyTaskContractChangeDecision,
} from '#modules/tasks/domain/task-authoring/task_contract_change_classifier'

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T

function contract(): Mutable<ResolvedTaskContractV1> {
  return structuredClone(RESOLVED_TASK_CONTRACT_V1_FIXTURE) as unknown as Mutable<ResolvedTaskContractV1>
}

test.group('Unit | Task contract change classifier', () => {
  test('pins an explicit initial V1 decision and rejects unknown historical versions', ({
    assert,
  }) => {
    const next = contract()

    assert.isTrue(
      verifyTaskContractChangeDecision({
        decision: INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
        previous: null,
        next,
      })
    )
    assert.isFalse(
      verifyTaskContractChangeDecision({
        decision: {
          ...INITIAL_TASK_CONTRACT_CHANGE_DECISION_V1,
          classifierVersion: 'suar.task_contract_change_classifier.v2',
        },
        previous: null,
        next,
      })
    )
  })

  test('verifies stored V1 policy independently from a stricter caller policy', ({ assert }) => {
    const previous = contract()
    const next = contract()
    next.work.dueAt = '2026-09-01T00:00:00.000Z'
    const immutableV1 = classifyTaskContractChangeV1({ previous, next })
    const stricterCurrentCall = classifyTaskContractChange({
      previous,
      next,
      policy: { deadlinePriorityRequiresReack: true },
    })

    assert.isFalse(immutableV1.requiresReack)
    assert.isTrue(stricterCurrentCall.requiresReack)
    assert.isTrue(
      verifyTaskContractChangeDecision({ decision: immutableV1, previous, next })
    )
    assert.isFalse(
      verifyTaskContractChangeDecision({
        decision: { ...immutableV1, requiresReack: true },
        previous,
        next,
      })
    )
  })

  test('returns a stable no-change decision for identical contracts', ({ assert }) => {
    assert.deepEqual(
      classifyTaskContractChange({ previous: contract(), next: contract() }),
      {
        changeClass: null,
        code: 'TVA.CHANGE.NONE',
        codes: [],
        changedPaths: [],
        requiresReack: false,
      }
    )
  })

  test('classifies rich formatting-only edits as editorial without re-ack', ({ assert }) => {
    const previous = contract()
    const next = contract()
    next.specification.richContent = {
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { alignment: 'center' } }],
    }

    assert.deepEqual(classifyTaskContractChange({ previous, next }), {
      changeClass: 'editorial',
      code: 'TVA.CHANGE.EDITORIAL',
      codes: ['TVA.CHANGE.EDITORIAL'],
      changedPaths: ['specification.richContent'],
      requiresReack: false,
    })
  })

  test('classifies non-critical specification explanation edits as clarification', ({ assert }) => {
    const previous = contract()
    const next = contract()
    const firstSection = previous.specification.sections[0]
    if (!firstSection) {
      throw new TypeError('Resolved contract fixture must include a specification section')
    }
    const nonCriticalSection = {
      ...firstSection,
      id: '30000000-0000-4000-8000-000000000077',
      key: 'background',
      title: 'Background',
      plainText: 'Supporting background.',
      critical: false,
    }
    previous.specification.sections.push(nonCriticalSection)
    next.specification.sections.push(structuredClone(nonCriticalSection))
    previous.specification.plainText = `${previous.specification.plainText}\nSupporting background.`
    next.specification.plainText = `${next.specification.plainText}\nSupporting background.`
    const nonCriticalIndex = next.specification.sections.findIndex((section) => !section.critical)
    assert.isAtLeast(nonCriticalIndex, 0)
    const section = next.specification.sections[nonCriticalIndex]
    if (!section) {
      throw new TypeError('Test setup must include the non-critical specification section')
    }
    next.specification.sections[nonCriticalIndex] = {
      ...section,
      plainText: `${section.plainText} Example added.`,
    }
    next.specification.plainText = `${next.specification.plainText}\nExample added.`

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'clarification')
    assert.equal(decision.code, 'TVA.CHANGE.CLARIFICATION')
    assert.isFalse(decision.requiresReack)
    assert.deepEqual(decision.changedPaths, [
      'specification.plainText',
      `specification.sections.${nonCriticalIndex}.plainText`,
    ])
  })

  test('classifies due date and explicit priority changes using policy-controlled re-ack', ({
    assert,
  }) => {
    const previous = contract()
    const next = contract()
    next.work.dueAt = '2026-09-01T00:00:00.000Z'

    const defaultDecision = classifyTaskContractChange({
      previous,
      next,
      previousPriority: 'normal',
      nextPriority: 'urgent',
    })
    const strictDecision = classifyTaskContractChange({
      previous,
      next,
      previousPriority: 'normal',
      nextPriority: 'urgent',
      policy: { deadlinePriorityRequiresReack: true },
    })

    assert.equal(defaultDecision.changeClass, 'deadline_priority')
    assert.deepEqual(defaultDecision.changedPaths, ['priority', 'work.dueAt'])
    assert.isFalse(defaultDecision.requiresReack)
    assert.isTrue(strictDecision.requiresReack)
  })

  test('classifies scope and deliverable changes as material and requires re-ack', ({ assert }) => {
    const previous = contract()
    const next = contract()
    next.work.object = 'pre-order cancellation API'
    next.work.deliverables = [
      ...next.work.deliverables,
      {
        id: '30000000-0000-4000-8000-000000000099',
        title: 'Migration plan',
        description: 'Plan the contract migration',
        expectedFormat: 'markdown',
        expectedLocation: null,
      },
    ]

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'material_scope')
    assert.equal(decision.code, 'TVA.CHANGE.MATERIAL_SCOPE')
    assert.isTrue(decision.requiresReack)
    assert.include(decision.changedPaths, 'work.object')
    assert.include(decision.changedPaths, 'work.deliverables.length')
  })

  test('uses acceptance over material scope when both change', ({ assert }) => {
    const previous = contract()
    const next = contract()
    const criterion = previous.work.acceptanceCriteria[0]
    if (!criterion) {
      throw new TypeError('Resolved contract fixture must include an acceptance criterion')
    }
    next.work.object = 'pre-order write API'
    next.work.acceptanceCriteria = [
      { ...criterion, statement: 'p95 latency is below 200ms' },
    ]

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'acceptance')
    assert.deepEqual(decision.codes.slice(0, 2), [
      'TVA.CHANGE.ACCEPTANCE',
      'TVA.CHANGE.MATERIAL_SCOPE',
    ])
    assert.isTrue(decision.requiresReack)
  })

  test('uses evidence over acceptance when both change', ({ assert }) => {
    const previous = contract()
    const next = contract()
    const criterion = previous.work.acceptanceCriteria[0]
    const evidenceRequirement = previous.evidence.requirements[0]
    if (!criterion || !evidenceRequirement) {
      throw new TypeError('Resolved contract fixture must include acceptance and evidence entries')
    }
    next.work.acceptanceCriteria = [
      { ...criterion, statement: 'Contract tests pass' },
    ]
    next.evidence.requirements = [
      {
        ...evidenceRequirement,
        title: 'Approved API contract test report',
      },
    ]

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'evidence')
    assert.deepEqual(decision.codes.slice(0, 2), [
      'TVA.CHANGE.EVIDENCE',
      'TVA.CHANGE.ACCEPTANCE',
    ])
    assert.isTrue(decision.requiresReack)
  })

  test('uses ownership as the highest-risk class', ({ assert }) => {
    const previous = contract()
    const next = contract()
    next.work.ownershipLevel = 'lead'
    next.evidence.profileEligibility = !next.evidence.profileEligibility

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'ownership')
    assert.deepEqual(decision.codes.slice(0, 2), [
      'TVA.CHANGE.OWNERSHIP',
      'TVA.CHANGE.EVIDENCE',
    ])
    assert.isTrue(decision.requiresReack)
  })

  test('treats an inherited Project or Work Package pin change as material even when content matches', ({
    assert,
  }) => {
    const previous = contract()
    const next = contract()
    next.inheritedFrom.projectContextVersionId = '30000000-0000-4000-8000-000000000088'

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'material_scope')
    assert.deepEqual(decision.codes, [
      'TVA.CHANGE.MATERIAL_SCOPE',
      'TVA.CHANGE.INHERITED_PIN_CHANGED',
    ])
    assert.deepEqual(decision.changedPaths, ['inheritedFrom.projectContextVersionId'])
    assert.isTrue(decision.requiresReack)
  })

  test('fails safe to material when critical plain specification text drifts', ({ assert }) => {
    const previous = contract()
    const next = contract()
    const criticalIndex = next.specification.sections.findIndex((section) => section.critical)
    assert.isAtLeast(criticalIndex, 0)
    const section = next.specification.sections[criticalIndex]
    if (!section) {
      throw new TypeError('Resolved contract fixture must include a critical specification section')
    }
    next.specification.sections[criticalIndex] = {
      ...section,
      plainText: `${section.plainText} Implement an additional endpoint.`,
    }
    next.specification.plainText = `${next.specification.plainText}\nImplement an additional endpoint.`

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'material_scope')
    assert.include(decision.codes, 'TVA.CHANGE.CRITICAL_SPECIFICATION_DRIFT')
    assert.isTrue(decision.requiresReack)
  })

  test('fails safe when the aggregate plain projection changes without a matching section', ({
    assert,
  }) => {
    const previous = contract()
    const next = contract()
    next.specification.plainText = `${next.specification.plainText}\nUnmapped requirement.`

    const decision = classifyTaskContractChange({ previous, next })

    assert.equal(decision.changeClass, 'material_scope')
    assert.deepEqual(decision.codes, [
      'TVA.CHANGE.MATERIAL_SCOPE',
      'TVA.CHANGE.UNEXPLAINED_PLAIN_TEXT_DRIFT',
    ])
    assert.isTrue(decision.requiresReack)
  })
})
