import { DefaultSharedDependencies } from '../ports/shared_external_dependencies_impl.js'
import type { SharedExternalDependencies } from '../ports/shared_external_dependencies.js'

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
  static async execute(
    deps: SharedExternalDependencies = DefaultSharedDependencies
  ): Promise<
    {
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }[]
  > {
    const skills = await deps.skill.listActiveSkills()
    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
    })) as {
      id: string
      skill_name: string
      category_code: string | null
      [key: string]: unknown
    }[]
  }
}
