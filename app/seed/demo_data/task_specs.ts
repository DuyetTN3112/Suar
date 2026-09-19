import { TASK_SPECS } from './tasks/baseline_task_specs.js'
import { buildGeneratedTaskSpecs } from './tasks/generated_task_builder.js'
import { SCENARIO_TASK_SPECS } from './tasks/scenario_task_specs.js'
import type { TaskSpec } from './types.js'

export type { TaskRequiredSkillCategory } from './tasks/task_skill_category_rules.js'
export { getTaskRequiredSkillCategory } from './tasks/task_skill_category_rules.js'
export { TASK_SPECS }
export { buildGeneratedTaskSpecs }

export interface SeededTaskSpecOptions {
  dense?: boolean
}

export const CORE_TASK_SPECS = [...TASK_SPECS, ...SCENARIO_TASK_SPECS]
export const GENERATED_TASK_SPECS = buildGeneratedTaskSpecs(CORE_TASK_SPECS)

export function getSeededTaskSpecs(options: SeededTaskSpecOptions = {}): TaskSpec[] {
  return options.dense ? [...CORE_TASK_SPECS, ...GENERATED_TASK_SPECS] : [...CORE_TASK_SPECS]
}

export function getTaskSpec(taskKey: string): TaskSpec {
  const spec = getSeededTaskSpecs({ dense: true }).find((item) => item.key === taskKey)
  if (!spec) {
    throw new Error(`Missing task spec for ${taskKey}`)
  }

  return spec
}
