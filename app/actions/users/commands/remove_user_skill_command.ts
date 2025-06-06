import type { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import UserSkill from '#models/user_skill'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { RemoveUserSkillDTO } from '#actions/users/dtos/user_skill_dtos'

/**
 * Command to remove a skill from user's profile
 */
export default class RemoveUserSkillCommand extends BaseCommand<RemoveUserSkillDTO> {
  constructor(protected override ctx: HttpContext) {
    super(ctx)
  }

  async handle(dto: RemoveUserSkillDTO): Promise<void> {
    await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await UserSkill.query({ client: trx })
        .where('id', dto.user_skill_id)
        .where('user_id', userId)
        .preload('skill')
        .firstOrFail()

      const skillInfo = {
        skill_id: userSkill.skill_id,
        skill_name: userSkill.skill.skill_name,
        level_code: userSkill.level_code,
      }

      // Delete the user skill
      await userSkill.useTransaction(trx).delete()

      // Log audit
      await this.logAudit('remove_skill', 'user_skill', dto.user_skill_id, skillInfo, null)

      // Invalidate user profile cache
      await CacheService.deleteByPattern(`user:profile:${String(userId)}`)

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
