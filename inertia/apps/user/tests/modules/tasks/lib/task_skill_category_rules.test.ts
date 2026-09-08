import { describe, expect, it } from 'vitest'

import {
  countTaskSkillsByCategory,
  getTaskSkillCategoryViolations,
} from '@/apps/user/modules/tasks/lib/rules/task_skill_category_rules'

describe('task skill category policy', () => {
  it('does not invent missing categories for a relevant-capability task', () => {
    const counts = countTaskSkillsByCategory(['technology'])

    expect(getTaskSkillCategoryViolations(counts)).toEqual([])
  })
})
