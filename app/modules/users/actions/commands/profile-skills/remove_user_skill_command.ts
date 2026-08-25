import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { RemoveUserSkillDTO } from '#modules/users/actions/dtos/request/profile-skills/user_skill_dtos'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * Command to remove a skill from user's profile
 */
export default class RemoveUserSkillCommand extends BaseCommand<RemoveUserSkillDTO> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly profiles: UserProfileRepository,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly events: UserApplicationEventPublisher
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: RemoveUserSkillDTO): Promise<void> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await this.profiles.findOwnedUserSkill(dto.user_skill_id, userId, trx)

      if (!userSkill) {
        throw new NotFoundException('User skill không tồn tại')
      }

      const [skillFact] = await this.skillCatalog.findProfileFactsByIds(
        [userSkill.skill_id],
        trx
      )
      const skillInfo = {
        skill_id: userSkill.skill_id,
        skill_name: skillFact?.skill_name ?? userSkill.skill_id,
        verified_public_proficiency_code: userSkill.verified_public_proficiency_code,
      }

      // Delete the user skill
      await this.profiles.deleteUserSkill(userSkill.id, trx)

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'remove_skill',
            critical: true,
            entity_type: 'user_skill',
            entity_id: dto.user_skill_id,
            old_values: skillInfo,
            new_values: null,
          },
          trx
        )
      }

      return {
        skillScoreUpdatedEvent: {
          userId,
          skillId: userSkill.skill_id,
          oldScore: null,
          newScore: 0,
        },
      }
    })

    await this.settlePostCommitEffect(
      'user.skill_score.updated',
      () => this.events.publishSkillScoreUpdated(result.skillScoreUpdatedEvent),
      {
        userId: result.skillScoreUpdatedEvent.userId,
        actorId: this.execCtx.userId ?? result.skillScoreUpdatedEvent.userId,
      }
    )
  }
}
