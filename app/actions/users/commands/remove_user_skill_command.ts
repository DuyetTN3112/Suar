import { BaseCommand } from '#actions/shared/base_command'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { RemoveUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import BusinessLogicException from '#exceptions/business_logic_exception'
import UserSkillRepository from '#infra/users/repositories/user_skill_repository'

/**
 * Command to remove a skill from user's profile
 */
export default class RemoveUserSkillCommand extends BaseCommand<RemoveUserSkillDTO> {
  async handle(dto: RemoveUserSkillDTO): Promise<void> {
    await this.executeInTransaction(async (trx) => {
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

      const skillInfo = {
        skill_id: userSkill.skill_id,
        skill_name: userSkill.skill.skill_name,
        level_code: userSkill.level_code,
      }

      // Delete the user skill
      await UserSkillRepository.delete(userSkill, trx)

      // Log audit
      await this.logAudit('remove_skill', 'user_skill', dto.user_skill_id, skillInfo, null)

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${userId}`)

      // Emit skill score event for spider chart cache invalidation
      void emitter.emit('skill:score:updated', {
        userId,
        skillId: userSkill.skill_id,
        oldScore: null,
        newScore: 0,
      })
    })
  }
}
