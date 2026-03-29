import {
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  type SkillCategoryCodeValue,
  isSkillCategoryCode,
} from '#modules/skills/public_contracts/skill_constants'

export const TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS = {
  technology: 1,
  engineering: 1,
  soft_skill: 1,
  delivery: 1,
} as const satisfies Record<SkillCategoryCodeValue, number>

export type TaskRequiredSkillCategory = keyof typeof TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS

export type TaskRequiredSkillCategoryCounts = Record<TaskRequiredSkillCategory, number>

export interface TaskRequiredSkillCategoryViolation {
  category: TaskRequiredSkillCategory
  actual: number
  minimum: number
}

export function createEmptyTaskRequiredSkillCategoryCounts(): TaskRequiredSkillCategoryCounts {
  return {
    technology: 0,
    engineering: 0,
    soft_skill: 0,
    delivery: 0,
  }
}

export function countTaskRequiredSkillCategories(
  categories: Array<string | null | undefined>
): TaskRequiredSkillCategoryCounts {
  const counts = createEmptyTaskRequiredSkillCategoryCounts()

  for (const category of categories) {
    if (isSkillCategoryCode(category)) {
      counts[category] += 1
    }
  }

  return counts
}

export function getTaskRequiredSkillCategoryViolations(
  counts: TaskRequiredSkillCategoryCounts
): TaskRequiredSkillCategoryViolation[] {
  return SKILL_CATEGORY_ORDER.filter(
    (category) => counts[category] < TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS[category]
  ).map((category) => ({
    category,
    actual: counts[category],
    minimum: TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS[category],
  }))
}

export function formatTaskRequiredSkillCategoryViolations(
  violations: TaskRequiredSkillCategoryViolation[]
): string {
  const details = violations
    .map((violation) => {
      const label = SKILL_CATEGORY_LABELS[violation.category].labelVi
      return `${label} ${violation.actual}/${violation.minimum}`
    })
    .join(', ')

  return `Mỗi task phải có ít nhất ${TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS.technology} skill cho từng nhóm năng lực. Thiếu: ${details}.`
}
