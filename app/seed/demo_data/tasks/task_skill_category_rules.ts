export type TaskRequiredSkillCategory = 'technology' | 'engineering' | 'soft_skill' | 'delivery'

const TASK_REQUIRED_SKILL_CATEGORY_ORDER: TaskRequiredSkillCategory[] = [
  'technology',
  'engineering',
  'soft_skill',
  'delivery',
]

const TASK_REQUIRED_SKILL_CATEGORY_BY_CODE: Record<string, TaskRequiredSkillCategory> = {
  react: 'technology',
  nodejs: 'technology',
  typescript: 'technology',
  svelte: 'technology',
  postgresql: 'technology',
  devops: 'technology',
  testing: 'engineering',
  code_review: 'engineering',
  oop: 'engineering',
  design_patterns: 'engineering',
  clean_code: 'engineering',
  api_design: 'engineering',
  system_design: 'engineering',
  design_system: 'engineering',
  communication: 'soft_skill',
  problem_solving: 'soft_skill',
  leadership: 'soft_skill',
  planning: 'delivery',
  estimation: 'delivery',
  release_management: 'delivery',
  risk_tracking: 'delivery',
  documentation: 'delivery',
}

const TASK_REQUIRED_SKILL_FALLBACKS: Record<TaskRequiredSkillCategory, string> = {
  technology: 'typescript',
  engineering: 'api_design',
  soft_skill: 'communication',
  delivery: 'planning',
}

export function getTaskRequiredSkillCategory(skillCode: string): TaskRequiredSkillCategory | null {
  return TASK_REQUIRED_SKILL_CATEGORY_BY_CODE[skillCode] ?? null
}

export function ensureFourCategoryRequiredSkills(skills: string[]): string[] {
  const requiredSkills = [...skills]

  for (const category of TASK_REQUIRED_SKILL_CATEGORY_ORDER) {
    const hasCategory = requiredSkills.some(
      (skillCode) => TASK_REQUIRED_SKILL_CATEGORY_BY_CODE[skillCode] === category
    )

    if (!hasCategory) {
      requiredSkills.push(TASK_REQUIRED_SKILL_FALLBACKS[category])
    }
  }

  return [...new Set(requiredSkills)]
}
