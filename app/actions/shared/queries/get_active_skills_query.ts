import Skill from '#models/skill'

/**
 * Query: Get Active Skills
 *
 * Returns all active skills ordered by name.
 * Used by profile edit and review forms.
 */
export default class GetActiveSkillsQuery {
  /**
   * Get all active skills, serialized for frontend consumption.
   */
  static async execute(): Promise<
    Array<{
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }>
  > {
    const skills = await Skill.query().where('is_active', true).orderBy('skill_name')
    return skills.map((s) => s.serialize()) as Array<{
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }>
  }
}
