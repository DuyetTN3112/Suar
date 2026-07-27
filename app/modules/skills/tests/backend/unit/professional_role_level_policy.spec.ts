import { test } from '@japa/runner'

import {
  assertValidProfessionalRoleLevelConfiguration,
  getConfiguredProficiencyLevelIds,
  type ProfessionalRoleProficiencyLevel,
} from '#modules/skills/domain/project-skills/professional_role_level_policy'

const levels: ProfessionalRoleProficiencyLevel[] = [
  { id: 'level-1', scaleId: 'scale-1', ordinal: 1 },
  { id: 'level-2', scaleId: 'scale-1', ordinal: 2 },
  { id: 'level-3', scaleId: 'scale-1', ordinal: 3 },
]

test.group('Professional role level policy', () => {
  test('collects only configured proficiency level ids', ({ assert }) => {
    assert.deepEqual(
      getConfiguredProficiencyLevelIds({
        minimumLevelId: 'level-1',
        targetLevelId: null,
        assessmentCeilingLevelId: '',
      }),
      ['level-1']
    )
  })

  test('accepts levels from one scale in ascending order', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertValidProfessionalRoleLevelConfiguration(
        {
          minimumLevelId: 'level-1',
          targetLevelId: 'level-2',
          assessmentCeilingLevelId: 'level-3',
        },
        levels
      )
    )
  })

  test('rejects a configured level that does not exist', ({ assert }) => {
    assert.throws(
      () =>
        assertValidProfessionalRoleLevelConfiguration(
          { minimumLevelId: 'missing-level' },
          levels
        ),
      'Proficiency level not found: missing-level'
    )
  })

  test('rejects levels from different scales', ({ assert }) => {
    assert.throws(
      () =>
        assertValidProfessionalRoleLevelConfiguration(
          { minimumLevelId: 'level-1', targetLevelId: 'other-scale-level' },
          [...levels, { id: 'other-scale-level', scaleId: 'scale-2', ordinal: 2 }]
        ),
      'All proficiency levels must belong to the same proficiency scale'
    )
  })

  test('rejects descending minimum, target, and ceiling levels', ({ assert }) => {
    assert.throws(
      () =>
        assertValidProfessionalRoleLevelConfiguration(
          {
            minimumLevelId: 'level-2',
            targetLevelId: 'level-1',
            assessmentCeilingLevelId: 'level-3',
          },
          levels
        ),
      'Minimum level ordinal must be <= target level ordinal'
    )

    assert.throws(
      () =>
        assertValidProfessionalRoleLevelConfiguration(
          {
            minimumLevelId: 'level-1',
            targetLevelId: 'level-3',
            assessmentCeilingLevelId: 'level-2',
          },
          levels
        ),
      'Target level ordinal must be <= assessment ceiling level ordinal'
    )

    assert.throws(
      () =>
        assertValidProfessionalRoleLevelConfiguration(
          {
            minimumLevelId: 'level-3',
            assessmentCeilingLevelId: 'level-2',
          },
          levels
        ),
      'Minimum level ordinal must be <= assessment ceiling level ordinal'
    )
  })
})
