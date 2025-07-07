import SkillRepository from '#infra/skills/repositories/skill_repository'

/**
 * Query: Get Active Skills
 *
 * Returns all active skills ordered by name.
 * Used by profile edit and review forms.
 */
export default class GetActiveSkillsQuery {
  private readonly __instanceMarker = true

  static {
    void new GetActiveSkillsQuery().__instanceMarker
  }

  /**
   * Get all active skills, serialized for frontend consumption.
   */
  static async execute(): Promise<
    {
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }[]
  > {
    const skills = await SkillRepository.activeSkills()
    return skills.map((s) => s.serialize()) as {
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }[]
  }
}
