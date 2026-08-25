import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { UpdateUserSkillDTO } from '#modules/users/actions/dtos/request/profile-skills/user_skill_dtos'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type { UserSkillReader } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserTransactionRunner } from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
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
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly profiles: UserProfileRepository,
    private readonly skillReader: UserSkillReader,
    private readonly events: UserApplicationEventPublisher
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: UpdateUserSkillDTO): Promise<UserSkillRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Find and verify ownership of the user skill
      const userSkill = await this.profiles.findOwnedUserSkill(dto.user_skill_id, userId, trx)

      if (!userSkill) {
        throw new NotFoundException('User skill không tồn tại')
      }

      // v3.1: Skill source integrity guard
      // User không thể tự sửa reviewed score - chỉ review pipeline mới được cập nhật
      if (userSkill.source === 'reviewed') {
        throw new ConflictException(
          'Không thể tự cập nhật skill score từ reviewed source. ' +
            'Reviewed score chỉ được cập nhật qua review pipeline.'
        )
      }

      const oldValues = {
        verified_public_proficiency_code: userSkill.verified_public_proficiency_code,
      }

      // v3: Validate new proficiency level against enum
      if (!isCanonicalProficiencyLevelCode(dto.verified_public_proficiency_code)) {
        throw ValidationException.field(
          'verified_public_proficiency_code',
          `Mức độ thành thạo không hợp lệ: ${dto.verified_public_proficiency_code}`
        )
      }

      // Resolve level ID
      const proficiencyLevelId = await this.skillReader.resolveProficiencyLevelId(
        dto.verified_public_proficiency_code,
        trx
      )
      const persistedLevelCode = getCanonicalProficiencyLevelValue(
        dto.verified_public_proficiency_code
      )

      // Update public proficiency code while keeping legacy column mapping intact
      const updatedUserSkill = await this.profiles.updateUserSkill(
        userSkill.id,
        {
          verified_public_proficiency_code: persistedLevelCode,
          proficiency_level_id: proficiencyLevelId,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'update_skill',
            critical: true,
            entity_type: 'user_skill',
            entity_id: dto.user_skill_id,
            old_values: oldValues,
            new_values: {
              verified_public_proficiency_code: persistedLevelCode,
            },
          },
          trx
        )
      }

      return {
        userSkill: updatedUserSkill,
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

    return result.userSkill
  }
}
