
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/proficiency_framework'
import { isSkillCategoryCode, type SkillCategoryCodeValue } from '#modules/skills/public_contracts/skill_constants'

/**
 * AddUserSkillDTO
 *
 * Data transfer object for adding a skill to user's profile.
 * Used by AddUserSkillCommand.
 * vNext: verified_public_proficiency_code is the public proficiency conclusion code.
 */
export class AddUserSkillDTO {
  declare skill_id: string | null
  declare custom_skill_name: string | null
  declare category_code: SkillCategoryCodeValue | null
  declare verified_public_proficiency_code: string

  constructor(skillId: string | null, levelCode: string, customSkillName?: string | null, categoryCode?: string | null) {
    if (!isCanonicalProficiencyLevelCode(levelCode)) {
      throw new ValidationException(
        `verified_public_proficiency_code must be a canonical code (l0-l14): ${levelCode}`
      )
    }

    const normalizedSkillId = typeof skillId === 'string' && skillId.trim().length > 0
      ? skillId.trim()
      : null
    const normalizedCustomSkillName =
      typeof customSkillName === 'string' && customSkillName.trim().length > 0
        ? customSkillName.trim()
        : null

    if (!normalizedSkillId && !normalizedCustomSkillName) {
      throw new ValidationException('skill_id or custom_skill_name is required')
    }

    if (normalizedCustomSkillName && !isSkillCategoryCode(categoryCode)) {
      throw new ValidationException(
        `category_code must be one of the canonical skill groups: ${categoryCode ?? ''}`
      )
    }
    const normalizedCategoryCode =
      normalizedCustomSkillName && isSkillCategoryCode(categoryCode) ? categoryCode : null

    this.skill_id = normalizedSkillId
    this.custom_skill_name = normalizedCustomSkillName
    this.category_code = normalizedCategoryCode
    this.verified_public_proficiency_code = levelCode
  }

  static fromValidatedPayload(payload: {
    skill_id?: string | null
    custom_skill_name?: string | null
    category_code?: string | null
    verified_public_proficiency_code: string
  }): AddUserSkillDTO {
    return new AddUserSkillDTO(
      payload.skill_id ?? null,
      payload.verified_public_proficiency_code,
      payload.custom_skill_name ?? null,
      payload.category_code ?? null
    )
  }
}

/**
 * UpdateUserSkillDTO
 *
 * Data transfer object for updating a user's skill.
 * Used by UpdateUserSkillCommand.
 * vNext: verified_public_proficiency_code is the public proficiency conclusion code.
 */
export class UpdateUserSkillDTO {
  declare user_skill_id: string
  declare verified_public_proficiency_code: string

  constructor(userSkillId: string, levelCode: string) {
    if (!isCanonicalProficiencyLevelCode(levelCode)) {
      throw new ValidationException(
        `verified_public_proficiency_code must be a canonical code (l0-l14): ${levelCode}`
      )
    }
    this.user_skill_id = userSkillId
    this.verified_public_proficiency_code = levelCode
  }

  static fromValidatedPayload(payload: {
    user_skill_id: string
    verified_public_proficiency_code: string
  }): UpdateUserSkillDTO {
    return new UpdateUserSkillDTO(payload.user_skill_id, payload.verified_public_proficiency_code)
  }
}

/**
 * RemoveUserSkillDTO
 *
 * Data transfer object for removing a skill from user's profile.
 * Used by RemoveUserSkillCommand.
 */
export class RemoveUserSkillDTO {
  declare user_skill_id: string

  constructor(userSkillId: string) {
    this.user_skill_id = userSkillId
  }

  static fromUserSkillId(userSkillId: string): RemoveUserSkillDTO {
    return new RemoveUserSkillDTO(userSkillId)
  }
}
