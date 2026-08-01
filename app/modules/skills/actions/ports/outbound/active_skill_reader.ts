import type { SkillActiveSkillOption } from '#modules/skills/public_contracts/active_skill_option'

export interface ActiveSkillReader {
  listActiveSkills(): Promise<SkillActiveSkillOption[]>
}
