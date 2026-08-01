import { test } from '@japa/runner'

import {
  assertRequiredSkillsPresent,
  findInvalidRequiredSkill,
} from '#modules/tasks/actions/commands/internal/create_task_transaction'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

const REQUIRED_SKILLS = [
  { id: VALID_UUID, level: 'l7' },
  { id: VALID_UUID_2, level: 'l10' },
] as const

test.group('Task required skill persistence support', () => {
  test('assertRequiredSkillsPresent rejects empty required skill lists', ({ assert }) => {
    assert.throws(() => {
      assertRequiredSkillsPresent([])
    })
    assert.doesNotThrow(() => {
      assertRequiredSkillsPresent([...REQUIRED_SKILLS])
    })
  })

  test('findInvalidRequiredSkill detects missing skill ids against active skill ids', ({
    assert,
  }) => {
    assert.isUndefined(
      findInvalidRequiredSkill([...REQUIRED_SKILLS], new Set([VALID_UUID, VALID_UUID_2]))
    )
    assert.deepEqual(
      findInvalidRequiredSkill([...REQUIRED_SKILLS], new Set([VALID_UUID])),
      REQUIRED_SKILLS[1]
    )
  })
})
