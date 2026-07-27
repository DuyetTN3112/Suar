import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { assertValidProjectTaskRequirementRange } from '#modules/skills/domain/project-skills/project_task_requirement_range_policy'

const levels = [
  { id: 'l2', scaleId: 'scale-1', ordinal: 2 },
  { id: 'l6', scaleId: 'scale-1', ordinal: 6 },
  { id: 'l10', scaleId: 'scale-1', ordinal: 10 },
]

test.group('Project task requirement range policy', () => {
  test('requires both ends of the Project Task range', ({ assert }) => {
    assert.throws(
      () => assertValidProjectTaskRequirementRange({}, levels),
      ValidationException,
      'Kỹ năng của Project phải chọn cả mức task thấp nhất và mức task cao nhất'
    )
  })

  test('accepts a complete ordered Project range', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertValidProjectTaskRequirementRange(
        {
          minimumTaskRequirementLevelId: 'l2',
          maximumTaskRequirementLevelId: 'l10',
        },
        levels
      )
    )
  })

  test('permits unconfigured catalog entries only for an internal role-template clone', ({
    assert,
  }) => {
    assert.doesNotThrow(() =>
      assertValidProjectTaskRequirementRange({}, levels, { allowUnconfigured: true })
    )
  })
})
