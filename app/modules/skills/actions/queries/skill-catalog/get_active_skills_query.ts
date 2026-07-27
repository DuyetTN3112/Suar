import type { ActiveSkillReader } from '../../ports/outbound/active_skill_reader.js'

import { BaseQuery } from '#modules/skills/actions/base_query'

/**
 * Query: Get Active Skills
 *
 * Returns all active skills ordered by name.
 * Used by profile edit and review forms.
 */
export interface ActiveSkillQueryResult {
  id: string
  skill_name: string
  category_code: string | null
  is_active: boolean
  [key: string]: unknown
}

export default class GetActiveSkillsQuery extends BaseQuery<
  ActiveSkillReader,
  ActiveSkillQueryResult[]
> {
  private readonly __instanceMarker = true

  static {
    void new GetActiveSkillsQuery().__instanceMarker
  }

  override handle(reader: ActiveSkillReader): Promise<ActiveSkillQueryResult[]> {
    return GetActiveSkillsQuery.execute(reader)
  }

  /**
   * Get all active skills, serialized for frontend consumption.
   */
  static async execute(reader: ActiveSkillReader): Promise<ActiveSkillQueryResult[]> {
    const skills = await reader.listActiveSkills()
    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
      is_active: skill.is_active,
    }))
  }
}
