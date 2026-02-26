import type { SkillCategoryCodeValue } from './skill_constants.js'

export type ResolveUserDeclaredSkillInput =
  | { skillId: string }
  | { customSkillName: string; categoryCode: SkillCategoryCodeValue }

export interface ResolvedUserDeclaredSkill {
  id: string
  skill_name: string
  category_code: string
}
