import type { SkillCategoryCodeValue } from './skill_constants.js'

export const CUSTOM_SKILL_CATALOG_SOURCES = {
  USER_PROFILE: 'user_profile',
  TASK_REQUIREMENT: 'task_requirement',
} as const

export type CustomSkillCatalogSource =
  (typeof CUSTOM_SKILL_CATALOG_SOURCES)[keyof typeof CUSTOM_SKILL_CATALOG_SOURCES]

export interface ResolveCustomSkillInput {
  name: string
  categoryCode: SkillCategoryCodeValue
  source: CustomSkillCatalogSource
}

export interface ResolvedCustomSkill {
  id: string
  skill_name: string
  category_code: string
}
