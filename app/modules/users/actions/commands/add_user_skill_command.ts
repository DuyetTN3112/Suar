import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
} from '#modules/skills/public_contracts/proficiency_framework'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { AddUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import type { UserApplicationEventPublisher } from '#modules/users/actions/ports/outbound/user_application_event_publisher'
import type { UserSkillReader } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/user_skill_catalog'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserSkillRecord } from '#modules/users/types/user_records'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 * Source mặc định = 'imported' (self-declared bởi user)
 */
export default class AddUserSkillCommand extends BaseCommand<AddUserSkillDTO, UserSkillRecord> {
  constructor(
    execCtx: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly profiles: UserProfileRepository,
    private readonly skillReader: UserSkillReader,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly events: UserApplicationEventPublisher
  ) {
    super(execCtx, transactions)
  }

  async handle(dto: AddUserSkillDTO): Promise<UserSkillRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const skill = await this.resolveSkill(dto, trx)

      if (!isCanonicalProficiencyLevelCode(dto.verified_public_proficiency_code)) {
        throw new BusinessLogicException(
          `Mức độ thành thạo không hợp lệ: ${dto.verified_public_proficiency_code}`
        )
      }

      // Check if user already has this skill
      const existing = await this.profiles.findUserSkill(userId, skill.id, trx)

      if (existing) {
        throw new ConflictException('User already has this skill')
      }

      const proficiencyLevelId = await this.skillReader.resolveProficiencyLevelId(
        dto.verified_public_proficiency_code,
        trx
      )
      const persistedLevelCode = getCanonicalProficiencyLevelValue(
        dto.verified_public_proficiency_code
      )

      // Create user skill with inline public proficiency code.
      // v3.1: source = 'imported' (self-declared, có thể update bởi user)
      const userSkill = await this.profiles.createUserSkill(
        {
          user_id: userId,
          skill_id: skill.id,
          verified_public_proficiency_code: persistedLevelCode,
          proficiency_level_id: proficiencyLevelId,
          total_reviews: 0,
          avg_score: null,
          source: 'imported' as const,
        },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'add_skill',
            critical: true,
            entity_type: 'user_skill',
            entity_id: userSkill.id,
            old_values: null,
            new_values: {
              skill_id: skill.id,
              skill_name: skill.skill_name,
              custom_skill_name: dto.custom_skill_name,
              verified_public_proficiency_code: persistedLevelCode,
              source: 'imported',
            },
          },
          trx
        )
      }

      return {
        userSkill,
        skillScoreUpdatedEvent: {
          userId,
          skillId: skill.id,
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

  private async resolveSkill(
    dto: AddUserSkillDTO,
    trx: UserTransaction
  ): Promise<{ id: string; skill_name: string; category_code: string }> {
    const input = dto.skill_id
      ? { skillId: dto.skill_id }
      : dto.custom_skill_name && dto.category_code
        ? {
            customSkillName: dto.custom_skill_name,
            categoryCode: dto.category_code,
          }
        : null

    if (!input) {
      throw new BusinessLogicException('Tên kỹ năng mới và nhóm kỹ năng là bắt buộc')
    }

    const skill = await this.skillCatalog.resolveUserDeclaredSkill(input, trx)
    if (!skill) {
      throw new BusinessLogicException('Skill không tồn tại hoặc đã bị vô hiệu hóa')
    }

    return skill
  }
}
