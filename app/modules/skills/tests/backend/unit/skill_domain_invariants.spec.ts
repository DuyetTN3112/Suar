import { test } from '@japa/runner'

import {
  CANONICAL_PROFICIENCY_LEVEL_COLORS,
  CANONICAL_PROFICIENCY_LEVEL_OPTIONS,
  CANONICAL_PROFICIENCY_LEVEL_VALUES,
} from '#modules/skills/public_contracts/proficiency_level_constants'
import {
  SKILL_CATEGORY_ORDER,
  SkillCategoryCode,
  skillCategoryOptions,
} from '#modules/skills/public_contracts/skill_constants'

test.group('Skill domain invariants', () => {
  test('proficiency and skill category options stay internally consistent', ({ assert }) => {
    assert.deepEqual(
      CANONICAL_PROFICIENCY_LEVEL_OPTIONS.map((option) => option.value),
      CANONICAL_PROFICIENCY_LEVEL_VALUES
    )
    assert.equal(CANONICAL_PROFICIENCY_LEVEL_OPTIONS.length, 15)
    assert.equal(CANONICAL_PROFICIENCY_LEVEL_OPTIONS[0]?.value, 'l0')
    assert.equal(CANONICAL_PROFICIENCY_LEVEL_OPTIONS[14]?.value, 'l14')
    assert.equal(
      CANONICAL_PROFICIENCY_LEVEL_OPTIONS[0]?.colorHex,
      CANONICAL_PROFICIENCY_LEVEL_COLORS[0]
    )
    assert.equal(
      CANONICAL_PROFICIENCY_LEVEL_OPTIONS[14]?.colorHex,
      CANONICAL_PROFICIENCY_LEVEL_COLORS[14]
    )
    assert.deepEqual(SKILL_CATEGORY_ORDER, [
      SkillCategoryCode.TECHNOLOGY,
      SkillCategoryCode.ENGINEERING,
      SkillCategoryCode.SOFT_SKILL,
      SkillCategoryCode.DELIVERY,
    ])
    assert.deepEqual(
      skillCategoryOptions.map((option) => option.value),
      ['technology', 'engineering', 'soft_skill', 'delivery']
    )

    for (const [index, current] of CANONICAL_PROFICIENCY_LEVEL_OPTIONS.entries()) {
      assert.isBelow(current.minPercentage, current.maxPercentage)
      const next = CANONICAL_PROFICIENCY_LEVEL_OPTIONS[index + 1]
      if (next) {
        assert.equal(current.maxPercentage, next.minPercentage)
        assert.isBelow(current.order, next.order)
      }
    }

    for (const [index, current] of CANONICAL_PROFICIENCY_LEVEL_OPTIONS.entries()) {
      assert.equal(current.order, index + 1)
    }

    const deliveryOption = skillCategoryOptions.find(
      (option) => option.value === SkillCategoryCode.DELIVERY
    )
    const technologyOption = skillCategoryOptions.find(
      (option) => option.value === SkillCategoryCode.TECHNOLOGY
    )
    const engineeringOption = skillCategoryOptions.find(
      (option) => option.value === SkillCategoryCode.ENGINEERING
    )

    assert.equal(technologyOption?.labelVi, 'Công nghệ')
    assert.equal(engineeringOption?.labelVi, 'Kỹ thuật phần mềm')
    assert.equal(deliveryOption?.displayType, 'spider_chart')
  })
})
