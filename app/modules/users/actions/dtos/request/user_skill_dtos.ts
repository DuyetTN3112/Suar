
/**
 * AddUserSkillDTO
 *
 * Data transfer object for adding a skill to user's profile.
 * Used by AddUserSkillCommand.
 * v3: level_code is an inline VARCHAR (ProficiencyLevel enum string)
 */
export class AddUserSkillDTO {
  declare skill_id: string
  declare level_code: string

  constructor(skillId: string, levelCode: string) {
    this.skill_id = skillId
    this.level_code = levelCode
  }

  static fromValidatedPayload(payload: {
    skill_id: string
    level_code: string
  }): AddUserSkillDTO {
    return new AddUserSkillDTO(payload.skill_id, payload.level_code)
  }
}

/**
 * UpdateUserSkillDTO
 *
 * Data transfer object for updating a user's skill.
 * Used by UpdateUserSkillCommand.
 * v3: level_code is an inline VARCHAR (ProficiencyLevel enum string)
 */
export class UpdateUserSkillDTO {
  declare user_skill_id: string
  declare level_code: string

  constructor(userSkillId: string, levelCode: string) {
    this.user_skill_id = userSkillId
    this.level_code = levelCode
  }

  static fromValidatedPayload(payload: {
    user_skill_id: string
    level_code: string
  }): UpdateUserSkillDTO {
    return new UpdateUserSkillDTO(payload.user_skill_id, payload.level_code)
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
