import emitter from '@adonisjs/core/services/emitter'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { BaseCommand } from '#actions/users/base_command'
import type { AddUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#actions/users/support/user_query_cache_keys'
import { ProficiencyLevel } from '#constants/user_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import { del as deleteCacheKey } from '#infra/cache/cache_service'
import * as userSkillQueries from '#infra/users/repositories/read/user_skill_queries'
import * as userSkillMutations from '#infra/users/repositories/write/user_skill_mutations'
import type { UserSkillRecord } from '#types/user_records'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 */
export default class AddUserSkillCommand extends BaseCommand<
  AddUserSkillDTO,
  UserSkillRecord
> {
  async handle(dto: AddUserSkillDTO): Promise<UserSkillRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Verify skill exists and is active
      const skill = await DefaultUserDependencies.skill.findActiveSkillById(dto.skill_id, trx)

      if (!skill) {
        throw new BusinessLogicException('Skill không tồn tại hoặc đã bị vô hiệu hóa')
      }

      // v3: Validate proficiency level code against enum
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(dto.level_code)) {
        throw new BusinessLogicException(`Mức độ thành thạo không hợp lệ: ${dto.level_code}`)
      }

      // Check if user already has this skill
      const existing = await userSkillQueries.findByUserAndSkill(userId, dto.skill_id, trx)

      if (existing) {
        throw new ConflictException('User already has this skill')
      }

      // Create user skill (v3: level_code instead of proficiency_level_id)
      const userSkill = await userSkillMutations.create(
        {
          user_id: userId,
          skill_id: dto.skill_id,
          level_code: dto.level_code,
          total_reviews: 0,
          avg_score: null,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_skill',
          entity_type: 'user_skill',
          entity_id: userSkill.id,
          old_values: null,
          new_values: {
            skill_id: dto.skill_id,
            skill_name: skill.skill_name,
            level_code: dto.level_code,
          },
        })
      }

      return {
        userSkill: userSkillQueries.toRecord(userSkill),
        cacheKeys: [
          ...buildUserProfileCacheKeys(userId),
          ...buildUserSkillsCacheKeys(userId, [skill.category_code]),
        ],
        skillScoreUpdatedEvent: {
          userId,
          skillId: dto.skill_id,
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
