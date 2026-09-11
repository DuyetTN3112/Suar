export const TASK_SKILL_CATEGORY_MINIMUMS = {
  technology: 0,
  engineering: 0,
  soft_skill: 0,
  delivery: 0,
} as const

export type TaskSkillCategoryCode = keyof typeof TASK_SKILL_CATEGORY_MINIMUMS

export type TaskSkillCategoryCounts = Record<TaskSkillCategoryCode, number>

export interface TaskSkillCategoryViolation {
  category: TaskSkillCategoryCode
  actual: number
  minimum: number
}

export const TASK_SKILL_CATEGORY_LABELS: Record<TaskSkillCategoryCode, string> = {
  technology: 'Technology',
  engineering: 'Software engineering',
  soft_skill: 'Soft skills',
  delivery: 'Delivery',
}

export const TASK_SKILL_CATEGORY_ORDER: TaskSkillCategoryCode[] = [
  'technology',
  'engineering',
  'soft_skill',
  'delivery',
]

export function isTaskSkillCategoryCode(value: unknown): value is TaskSkillCategoryCode {
  return (
    value === 'technology' ||
    value === 'engineering' ||
    value === 'soft_skill' ||
    value === 'delivery'
  )
}

export function createEmptyTaskSkillCategoryCounts(): TaskSkillCategoryCounts {
  return {
    technology: 0,
    engineering: 0,
    soft_skill: 0,
    delivery: 0,
  }
}

export function countTaskSkillsByCategory(
  categoryCodes: Array<string | null | undefined>
): TaskSkillCategoryCounts {
  const counts = createEmptyTaskSkillCategoryCounts()

  for (const categoryCode of categoryCodes) {
    if (isTaskSkillCategoryCode(categoryCode)) {
      counts[categoryCode] += 1
    }
  }

  return counts
}

export function getTaskSkillCategoryViolations(
  counts: TaskSkillCategoryCounts
): TaskSkillCategoryViolation[] {
  return TASK_SKILL_CATEGORY_ORDER.filter(
    (category) => counts[category] < TASK_SKILL_CATEGORY_MINIMUMS[category]
  ).map((category) => ({
    category,
    actual: counts[category],
    minimum: TASK_SKILL_CATEGORY_MINIMUMS[category],
  }))
}

export function formatTaskSkillCategoryViolations(
  violations: TaskSkillCategoryViolation[]
): string {
  const details = violations
    .map(
      (violation) =>
        `${TASK_SKILL_CATEGORY_LABELS[violation.category]} ${violation.actual}/${violation.minimum}`
    )
    .join(', ')

  return `Relevant skill groups only are required. Missing: ${details}.`
}
