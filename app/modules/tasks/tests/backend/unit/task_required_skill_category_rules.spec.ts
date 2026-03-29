import { test } from '@japa/runner'

import {
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/domain/task_required_skill_category_rules'

test.group('Task required skill category rules', () => {
  test('counts all four skill category groups', ({ assert }) => {
    const counts = countTaskRequiredSkillCategories([
      'technology',
      'engineering',
      'engineering',
      'soft_skill',
      'delivery',
      'technical',
      null,
      undefined,
    ])

    assert.deepEqual(counts, {
      technology: 1,
      engineering: 2,
      soft_skill: 1,
      delivery: 1,
    })
  })

  test('flags missing category minimums across four skill groups', ({ assert }) => {
    const counts = countTaskRequiredSkillCategories(['technology', 'engineering', 'soft_skill'])

    const violations = getTaskRequiredSkillCategoryViolations(counts)

    assert.deepEqual(violations, [{ category: 'delivery', actual: 0, minimum: 1 }])
    assert.include(formatTaskRequiredSkillCategoryViolations(violations), 'Thực thi 0/1')
    assert.include(
      formatTaskRequiredSkillCategoryViolations(violations),
      'Mỗi task phải có ít nhất 1 skill cho từng nhóm năng lực'
    )
  })
})
