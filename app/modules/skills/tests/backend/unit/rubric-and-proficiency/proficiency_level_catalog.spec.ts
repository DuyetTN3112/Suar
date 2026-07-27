import { test } from '@japa/runner'

import {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelLabel,
  getCanonicalProficiencyLevelOrder,
  getCanonicalProficiencyLevelValueFromPercentage,
  getCanonicalProficiencyMidpointPercentage,
  getPreferredTaskRequirementLevelValue,
  isHighCanonicalProficiencyLevel,
  listCanonicalProficiencyLevelOptions,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'

test.group('Proficiency level catalog', () => {
  test('lists canonical L0-L14 options in KB order', ({ assert }) => {
    const options = listCanonicalProficiencyLevelOptions()

    assert.lengthOf(options, 15)
    assert.equal(options[0]?.value, 'l0')
    assert.equal(options[0]?.label, 'L0 · Unassessed')
    assert.equal(options[14]?.value, 'l14')
    assert.equal(options[14]?.label, 'L14 · Expert / Master')
  })

  test('resolves canonical labels from both exact and legacy-compatible tokens', ({ assert }) => {
    assert.equal(getCanonicalProficiencyLevelLabel('l7'), 'L7 · Middle Solid')
    assert.equal(getCanonicalProficiencyLevelLabel('senior'), 'L10 · Senior Solid')
    assert.equal(findCanonicalProficiencyLevelOption('principal')?.value, 'l13')
  })

  test('prefers a practical default task requirement level over unassessed', ({ assert }) => {
    assert.equal(getPreferredTaskRequirementLevelValue(), 'l4')
    assert.equal(
      getPreferredTaskRequirementLevelValue([{ value: 'l0' }, { value: 'l1' }, { value: 'l3' }]),
      'l3'
    )
  })

  test('exposes canonical numeric and percentage helpers for both legacy and exact tokens', ({
    assert,
  }) => {
    assert.equal(getCanonicalProficiencyLevelOrder('l0'), 1)
    assert.equal(getCanonicalProficiencyLevelOrder('junior'), 5)
    assert.equal(getCanonicalProficiencyMidpointPercentage('l14'), 96.7)
    assert.equal(getCanonicalProficiencyLevelValueFromPercentage(50), 'l7')
    assert.isTrue(isHighCanonicalProficiencyLevel('senior'))
    assert.isTrue(isHighCanonicalProficiencyLevel('l12'))
    assert.isFalse(isHighCanonicalProficiencyLevel('l4'))
  })
})
