import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkill from '#models/user_skill'
import ProficiencyLevel from '#models/proficiency_level'
import CacheService from '#services/cache_service'
import type { UpdateUserSkillDTO } from '#actions/users/dtos/user_skill_dtos'

/**
 * Command to update a user's skill proficiency level
 */
export default class UpdateUserSkillCommand extends BaseCommand<UpdateUserSkillDTO, UserSkill> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: UpdateUserSkillDTO): Promise<UserSkill> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUser().id

      // Find and verify ownership of the user skill
      const userSkill = await UserSkill.query({ client: trx })
        .where('id', dto.user_skill_id)
        .where('user_id', userId)
        .preload('skill')
        .preload('proficiency_level')
        .firstOrFail()

      const oldValues = {
        proficiency_level_id: userSkill.proficiency_level_id,
        proficiency_level_name: userSkill.proficiency_level?.level_name_en,
      }

      // Verify new proficiency level exists
      const newProficiencyLevel = await ProficiencyLevel.query({ client: trx })
        .where('id', dto.proficiency_level_id)
        .firstOrFail()

      // Update the proficiency level
      userSkill.proficiency_level_id = dto.proficiency_level_id
      await userSkill.useTransaction(trx).save()

      // Log audit
      await this.logAudit('update_skill', 'user_skill', dto.user_skill_id, oldValues, {
        proficiency_level_id: dto.proficiency_level_id,
        proficiency_level_name: newProficiencyLevel.level_name_en,
      })

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${userId}`)

      return userSkill
    })
  }
}
