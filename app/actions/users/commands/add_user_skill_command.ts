import type { ExecutionContext } from '#types/execution_context'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkill from '#models/user_skill'
import Skill from '#models/skill'
import { ProficiencyLevel } from '#constants'
import type { AddUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ConflictException from '#exceptions/conflict_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 */
export default class AddUserSkillCommand extends BaseCommand<AddUserSkillDTO, UserSkill> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: AddUserSkillDTO): Promise<UserSkill> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Verify skill exists and is active
      const skill = await Skill.query({ client: trx })
        .where('id', dto.skill_id)
        .where('is_active', true)
        .firstOrFail()

      // v3: Validate proficiency level code against enum
      const validLevels = Object.values(ProficiencyLevel) as string[]
      if (!validLevels.includes(String(dto.level_code))) {
        throw new BusinessLogicException(
          `Mức độ thành thạo không hợp lệ: ${String(dto.level_code)}`
        )
      }

      // Check if user already has this skill
      const existing = await UserSkill.query({ client: trx })
        .where('user_id', userId)
        .where('skill_id', dto.skill_id)
        .first()

      if (existing) {
        throw new ConflictException('User already has this skill')
      }

      // Create user skill (v3: level_code instead of proficiency_level_id)
      const userSkill = await UserSkill.create(
        {
          user_id: String(userId),
          skill_id: String(dto.skill_id),
          level_code: String(dto.level_code),
          total_reviews: 0,
          avg_score: null,
        },
        { client: trx }
      )

      // Log audit
      await this.logAudit('add_skill', 'user_skill', userSkill.id, null, {
        skill_id: dto.skill_id,
        skill_name: skill.skill_name,
        level_code: dto.level_code,
      })

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${String(userId)}`)

      // Emit skill score event for spider chart cache invalidation
      void emitter.emit('skill:score:updated', {
        userId,
        skillId: dto.skill_id,
        oldScore: null,
        newScore: 0,
      })

      return userSkill
    })
  }
}
