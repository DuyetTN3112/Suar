import { randomUUID } from 'node:crypto'

import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { del as deleteCacheKey } from '#modules/cache/public_contracts/cache_store'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import { SKILL_DISPLAY_TYPES } from '#modules/skills/constants/skill_constants'
import {
  getCanonicalProficiencyLevelValue,
  isCanonicalProficiencyLevelCode,
  proficiencyFrameworkPublicApi,
} from '#modules/skills/public_contracts/proficiency_framework'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { AddUserSkillDTO } from '#modules/users/actions/dtos/request/user_skill_dtos'
import {
  buildUserProfileCacheKeys,
  buildUserSkillsCacheKeys,
} from '#modules/users/actions/support/user_query_cache_keys'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'
import * as userSkillMutations from '#modules/users/infra/repositories/write/user_skill_mutations'
import type { UserSkillRecord } from '#modules/users/types/user_records'

/**
 * Command to add a skill to user's profile
 * Creates a UserSkill record with initial proficiency level
 * Source mặc định = 'imported' (self-declared bởi user)
 */
export default class AddUserSkillCommand extends BaseCommand<
  AddUserSkillDTO,
  UserSkillRecord
> {
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
      const existing = await userSkillQueries.findByUserAndSkill(userId, skill.id, trx)

      if (existing) {
        throw new ConflictException('User already has this skill')
      }

      const matchedLevel = await proficiencyFrameworkPublicApi.mapCodeToLevel(
        dto.verified_public_proficiency_code,
        trx
      )
      const proficiencyLevelId = matchedLevel?.id ?? null
      const persistedLevelCode = getCanonicalProficiencyLevelValue(
        dto.verified_public_proficiency_code
      )

      // Create user skill with inline public proficiency code.
      // v3.1: source = 'imported' (self-declared, có thể update bởi user)
      const userSkill = await userSkillMutations.create(
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
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_skill',
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
          skillId: skill.id,
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

  private async resolveSkill(
    dto: AddUserSkillDTO,
    trx: TransactionClientContract
  ): Promise<{ id: string; skill_name: string; category_code: string }> {
    if (dto.skill_id) {
      const skill = await DefaultUserDependencies.skill.findActiveSkillById(dto.skill_id, trx)

      if (!skill) {
        throw new BusinessLogicException('Skill không tồn tại hoặc đã bị vô hiệu hóa')
      }

      return skill
    }

    if (!dto.custom_skill_name || !dto.category_code) {
      throw new BusinessLogicException('Tên kỹ năng mới và nhóm kỹ năng là bắt buộc')
    }

    const skillName = this.normalizeSkillName(dto.custom_skill_name)
    const skillCode = this.buildSkillCode(skillName)
    const now = new Date().toISOString()
    const existing = await trx
      .from('skills')
      .where('skill_code', skillCode)
      .first()

    if (existing) {
      await trx.from('skills').where('id', existing.id).update({
        skill_name: skillName,
        category_code: dto.category_code,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
        is_active: true,
        updated_at: now,
      })

      return {
        id: existing.id,
        skill_name: skillName,
        category_code: dto.category_code,
      }
    }

    const maxSortRow = await trx
      .from('skills')
      .max('sort_order as max_sort_order')
      .first()
    const rawMaxSortOrder = Number(maxSortRow?.max_sort_order ?? 0)
    const sortOrder = Number.isFinite(rawMaxSortOrder) ? rawMaxSortOrder + 1 : 0
    const id = randomUUID()

    await trx.table('skills').insert({
      id,
      skill_code: skillCode,
      skill_name: skillName,
      category_code: dto.category_code,
      display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
      description: `${skillName} - user-declared profile skill`,
      icon_url: null,
      is_active: true,
      sort_order: sortOrder,
      created_at: now,
      updated_at: now,
    })

    return {
      id,
      skill_name: skillName,
      category_code: dto.category_code,
    }
  }

  private normalizeSkillName(value: string): string {
    return value.trim().replace(/\s+/g, ' ')
  }

  private buildSkillCode(skillName: string): string {
    const normalized = skillName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')

    return normalized.length > 0 ? normalized : `custom_skill_${randomUUID()}`
  }
}
