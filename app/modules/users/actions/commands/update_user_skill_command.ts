import emitter from '@adonisjs/core/services/emitter'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
  proficiencyFrameworkPublicApi,
} from '#modules/skills/public_contracts/proficiency_framework'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UpdateUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import type { UserSkillRecord } from '#modules/users/types/user_records'

/**
 * Command to update a user's skill proficiency level
 *
 * Business rules:
 * - User có thể update level của skill có source = 'imported' (self-declared)
 * - User KHÔNG thể update level của skill có source = 'reviewed' (confirmed via review)
 *   → reviewed score chỉ được cập nhật qua review pipeline
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

      // v3.1: Skill source integrity guard
      // User không thể tự sửa reviewed score - chỉ review pipeline mới được cập nhật
      if (userSkill.source === 'reviewed') {
        throw new BusinessLogicException(
          'Không thể tự cập nhật skill score từ reviewed source. ' +
          'Reviewed score chỉ được cập nhật qua review pipeline.'
        )
      }

      const oldValues = {
        verified_public_proficiency_code: userSkill.verified_public_proficiency_code,
      }

      // v3: Validate new proficiency level against enum
      if (!isCanonicalProficiencyLevelCode(dto.verified_public_proficiency_code)) {
        throw new BusinessLogicException(
          `Mức độ thành thạo không hợp lệ: ${dto.verified_public_proficiency_code}`
        )
      }

      // Resolve level ID
      const matchedLevel = await proficiencyFrameworkPublicApi.mapCodeToLevel(
        dto.verified_public_proficiency_code,
        trx
      )
      const proficiencyLevelId = matchedLevel?.id ?? null
      const persistedLevelCode = getCanonicalProficiencyLevelValue(
        dto.verified_public_proficiency_code
      )

      // Update public proficiency code while keeping legacy column mapping intact
      userSkill.verified_public_proficiency_code = persistedLevelCode
      userSkill.proficiency_level_id = proficiencyLevelId
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
            verified_public_proficiency_code: persistedLevelCode,
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
