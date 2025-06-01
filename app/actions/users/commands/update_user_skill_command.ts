import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkill from '#models/user_skill'
import { ProficiencyLevel } from '#constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { UpdateUserSkillDTO } from '#actions/users/dtos/user_skill_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Command to update a user's skill proficiency level
 */
export default class UpdateUserSkillCommand extends BaseCommand<UpdateUserSkillDTO, UserSkill> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: UpdateUserSkillDTO): Promise<UserSkill> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await UserSkill.query({ client: trx })
        .where('id', dto.user_skill_id)
        .where('user_id', userId)
        .preload('skill')
        .firstOrFail()

      const oldValues = {
        level_code: userSkill.level_code,
      }

      // v3: Validate new proficiency level against enum
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(String(dto.level_code))) {
        throw new BusinessLogicException(
          `Mức độ thành thạo không hợp lệ: ${String(dto.level_code)}`
        )
      }

      // Update the level_code (v3: inline string column)
      userSkill.level_code = String(dto.level_code)
      await userSkill.useTransaction(trx).save()

      // Log audit
      await this.logAudit('update_skill', 'user_skill', dto.user_skill_id, oldValues, {
        level_code: dto.level_code,
      })

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${String(userId)}`)

      // Emit skill score event for spider chart cache invalidation
      void emitter.emit('skill:score:updated', {
        userId,
        skillId: userSkill.skill_id,
        oldScore: null,
        newScore: 0,
      })

      return userSkill
    })
  }
}
