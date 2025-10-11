import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import type { UpdateUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#actions/users/support/user_query_cache_keys'
import { ProficiencyLevel } from '#constants/user_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { del as deleteCacheKey } from '#infra/cache/cache_service'
import * as userSkillQueries from '#infra/users/repositories/read/user_skill_queries'
import * as userSkillMutations from '#infra/users/repositories/write/user_skill_mutations'
import type { UserSkillRecord } from '#types/user_records'

/**
 * Command to update a user's skill proficiency level
 */
export default class UpdateUserSkillCommand extends BaseCommand<
  UpdateUserSkillDTO,
  UserSkillRecord
> {
  async handle(dto: UpdateUserSkillDTO): Promise<UserSkillRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await userSkillQueries.findOwnedByIdWithSkill(
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
      await userSkillMutations.save(userSkill, trx)

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'update_skill',
          entity_type: 'user_skill',
          entity_id: dto.user_skill_id,
          old_values: oldValues,
          new_values: {
            level_code: dto.level_code,
          },
        })
      }

      return {
        userSkill: userSkillQueries.toRecord(userSkill),
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
