import { test } from '@japa/runner'

import {
  DEFAULT_TASK_REQUIRED_SKILL_CATEGORY_POLICY,
  LEGACY_FOUR_CATEGORY_TASK_SKILL_POLICY,
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/domain/task-requirements/task_required_skill_category_rules'

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

  test('TC-TVA-007 does not invent a four-category minimum for an ordinary task', ({ assert }) => {
    const counts = countTaskRequiredSkillCategories(['technology', 'engineering', 'soft_skill'])

    const violations = getTaskRequiredSkillCategoryViolations(
      counts,
      DEFAULT_TASK_REQUIRED_SKILL_CATEGORY_POLICY
    )

    assert.deepEqual(violations, [])
  })

  test('keeps an explicit legacy or organization policy enforceable without making it global', ({
    assert,
  }) => {
    const counts = countTaskRequiredSkillCategories(['technology', 'engineering', 'soft_skill'])
    const violations = getTaskRequiredSkillCategoryViolations(
      counts,
      LEGACY_FOUR_CATEGORY_TASK_SKILL_POLICY
    )

    assert.deepEqual(violations, [{ category: 'delivery', actual: 0, minimum: 1 }])
    assert.include(
      formatTaskRequiredSkillCategoryViolations(violations, LEGACY_FOUR_CATEGORY_TASK_SKILL_POLICY),
      'Thực thi 0/1'
    )
    assert.include(
      formatTaskRequiredSkillCategoryViolations(violations, LEGACY_FOUR_CATEGORY_TASK_SKILL_POLICY),
      'Chính sách legacy-four-category-v1'
    )
  })
})
