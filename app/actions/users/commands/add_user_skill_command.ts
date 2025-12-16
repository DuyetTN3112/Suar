import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkill from '#models/user_skill'
import Skill from '#models/skill'
import ProficiencyLevel from '#models/proficiency_level'
import type { AddUserSkillDTO } from '#actions/users/dtos/user_skill_dtos'
import CacheService from '#services/cache_service'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 */
export default class AddUserSkillCommand extends BaseCommand<AddUserSkillDTO, UserSkill> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: AddUserSkillDTO): Promise<UserSkill> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Verify skill exists and is active
      const skill = await Skill.query({ client: trx })
        .where('id', dto.skill_id)
        .where('is_active', true)
        .firstOrFail()

      // Verify proficiency level exists
      const proficiencyLevel = await ProficiencyLevel.query({ client: trx })
        .where('id', dto.proficiency_level_id)
        .firstOrFail()

      // Check if user already has this skill
      const existing = await UserSkill.query({ client: trx })
        .where('user_id', userId)
        .where('skill_id', dto.skill_id)
        .first()

      if (existing) {
        throw new Error('User already has this skill')
      }

      // Create user skill
      const userSkill = await UserSkill.create(
        {
          user_id: userId,
          skill_id: dto.skill_id,
          proficiency_level_id: dto.proficiency_level_id,
          total_reviews: 0,
          avg_score: null,
        },
        { client: trx }
      )

      // Log audit
      await this.logAudit('add_skill', 'user_skill', userSkill.id, null, {
        skill_id: dto.skill_id,
        skill_name: skill.skill_name,
        proficiency_level: proficiencyLevel.level_name_en,
      })

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${String(userId)}`)

      return userSkill
    })
  }
}
