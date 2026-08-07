import {
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  type SkillCategoryCodeValue,
  isSkillCategoryCode,
} from '#modules/skills/public_contracts/skill_constants'

const NO_CATEGORY_MINIMUMS = {
  technology: 0,
  engineering: 0,
  soft_skill: 0,
  delivery: 0,
} as const satisfies Record<SkillCategoryCodeValue, number>

const LEGACY_FOUR_CATEGORY_MINIMUMS = {
  technology: 1,
  engineering: 1,
  soft_skill: 1,
  delivery: 1,
} as const satisfies Record<SkillCategoryCodeValue, number>

export type TaskRequiredSkillCategory = keyof typeof NO_CATEGORY_MINIMUMS

export type TaskRequiredSkillCategoryCounts = Record<TaskRequiredSkillCategory, number>

export interface TaskRequiredSkillCategoryPolicy {
  readonly policyVersion: string
  readonly minimums: Readonly<Record<TaskRequiredSkillCategory, number>>
}

export const DEFAULT_TASK_REQUIRED_SKILL_CATEGORY_POLICY: TaskRequiredSkillCategoryPolicy = {
  policyVersion: 'relevant-capabilities-v1',
  minimums: NO_CATEGORY_MINIMUMS,
}

export const LEGACY_FOUR_CATEGORY_TASK_SKILL_POLICY: TaskRequiredSkillCategoryPolicy = {
  policyVersion: 'legacy-four-category-v1',
  minimums: LEGACY_FOUR_CATEGORY_MINIMUMS,
}

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
  counts: TaskRequiredSkillCategoryCounts,
  policy: TaskRequiredSkillCategoryPolicy = DEFAULT_TASK_REQUIRED_SKILL_CATEGORY_POLICY
): TaskRequiredSkillCategoryViolation[] {
  return SKILL_CATEGORY_ORDER.filter(
    (category) => counts[category] < policy.minimums[category]
  ).map((category) => ({
    category,
    actual: counts[category],
    minimum: policy.minimums[category],
  }))
}

export function formatTaskRequiredSkillCategoryViolations(
  violations: TaskRequiredSkillCategoryViolation[],
  policy: TaskRequiredSkillCategoryPolicy = DEFAULT_TASK_REQUIRED_SKILL_CATEGORY_POLICY
): string {
  const details = violations
    .map((violation) => {
      const label = SKILL_CATEGORY_LABELS[violation.category].labelVi
      return `${label} ${violation.actual}/${violation.minimum}`
    })
    .join(', ')

  return `Chính sách ${policy.policyVersion} yêu cầu nhóm năng lực tối thiểu. Thiếu: ${details}.`
}
