import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import type { RemoveUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#actions/users/support/user_query_cache_keys'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { del as deleteCacheKey } from '#infra/cache/cache_service'
import * as userSkillQueries from '#infra/users/repositories/read/user_skill_queries'
import * as userSkillMutations from '#infra/users/repositories/write/user_skill_mutations'

/**
 * Command to remove a skill from user's profile
 */
export default class RemoveUserSkillCommand extends BaseCommand<RemoveUserSkillDTO> {
  async handle(dto: RemoveUserSkillDTO): Promise<void> {
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

      const skillInfo = {
        skill_id: userSkill.skill_id,
        skill_name: userSkill.skill.skill_name,
        level_code: userSkill.level_code,
      }

      // Delete the user skill
      await userSkillMutations.delete(userSkill, trx)

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'remove_skill',
          entity_type: 'user_skill',
          entity_id: dto.user_skill_id,
          old_values: skillInfo,
          new_values: null,
        })
      }

      return {
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
  }
}
