import { test } from '@japa/runner'

import type { TaskReadinessResultV1 } from '#modules/tasks/public_contracts/task-authoring/task_contracts'
import { deriveResolvedReadinessFindingCodes } from '#modules/tasks/domain/task-authoring/task_readiness_resolution_history'

function assessment(input: {
  readonly blockers?: readonly string[]
  readonly warnings?: readonly string[]
}): TaskReadinessResultV1 {
  const findings = (codes: readonly string[], severity: 'blocker' | 'warning') =>
    codes.map((code) => ({
      code,
      severity,
      fieldPath: `/${code.toLowerCase()}`,
      sourcePath: null,
      message: code,
      remediationHint: `Resolve ${code}`,
    }))

  return {
    policyVersion: 'tva-readiness-v1',
    workState: 'needs_clarification',
    evidenceState: 'needs_clarification',
    assignmentReady: false,
    evidenceReady: false,
    blockers: findings(input.blockers ?? [], 'blocker'),
    warnings: findings(input.warnings ?? [], 'warning'),
    assessedAt: '2026-08-01T08:00:00.000Z',
  }
}

test.group('Unit | Task readiness finding resolution history', () => {
  test('derives sorted, deduplicated historical blocker and warning codes absent from current', ({
    assert,
  }) => {
    const historical = [
      assessment({ blockers: ['TVA.Z', 'TVA.A'], warnings: ['TVA.B', 'TVA.Z'] }),
      assessment({ blockers: ['TVA.C'], warnings: ['TVA.A'] }),
    ]
    const current = assessment({ blockers: ['TVA.C'], warnings: ['TVA.B'] })

    assert.deepEqual(deriveResolvedReadinessFindingCodes({ historical, current }), [
      'TVA.A',
      'TVA.Z',
    ])
  })

  test('does not mislabel a code still active at the current assessment as resolved', ({ assert }) => {
    const historical = [assessment({ blockers: ['TVA.BLOCKER'], warnings: ['TVA.WARNING'] })]
    const current = assessment({ blockers: ['TVA.BLOCKER'], warnings: ['TVA.WARNING'] })

    assert.deepEqual(deriveResolvedReadinessFindingCodes({ historical, current }), [])
  })

  test('returns no resolved codes for an empty immutable assessment history', ({ assert }) => {
    assert.deepEqual(
      deriveResolvedReadinessFindingCodes({ historical: [], current: assessment({}) }),
      []
    )
  })
})
