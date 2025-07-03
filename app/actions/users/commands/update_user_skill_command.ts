import { BaseCommand } from '#actions/shared/base_command'
import { ProficiencyLevel } from '#constants'
import { del as deleteCacheKey } from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { UpdateUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#actions/users/support/user_query_cache_keys'

/**
 * Command to update a user's skill proficiency level
 */
export default class UpdateUserSkillCommand extends BaseCommand<
  UpdateUserSkillDTO,
  import('#models/user_skill').default
> {
  async handle(dto: UpdateUserSkillDTO): Promise<import('#models/user_skill').default> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await UserSkillRepository.findOwnedByIdWithSkill(
        dto.user_skill_id,
        userId,
        trx
      )

      if (!userSkill) {
        throw new BusinessLogicException('User skill không tồn tại')
      }

      const oldValues = {
        level_code: userSkill.level_code,
      }

      // v3: Validate new proficiency level against enum
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(dto.level_code)) {
        throw new BusinessLogicException(`Mức độ thành thạo không hợp lệ: ${dto.level_code}`)
      }

      // Update the level_code (v3: inline string column)
      userSkill.level_code = dto.level_code
      await UserSkillRepository.save(userSkill, trx)

      // Log audit
      await this.logAudit('update_skill', 'user_skill', dto.user_skill_id, oldValues, {
        level_code: dto.level_code,
      })

      return {
        userSkill,
        cacheKeys: [
          ...buildUserProfileCacheKeys(userId),
          ...buildUserSkillsCacheKeys(userId, [userSkill.skill.category_code]),
        ],
        skillScoreUpdatedEvent: {
          userId,
          skillId: userSkill.skill_id,
          oldScore: null,
          newScore: 0,
        },
      }
    })

    for (const cacheKey of result.cacheKeys) {
      await deleteCacheKey(cacheKey)
    }
    void emitter.emit('skill:score:updated', result.skillScoreUpdatedEvent)

    return result.userSkill
  }
}
