/**
 * AddUserSkillDTO
 *
 * Data transfer object for adding a skill to user's profile.
 * Used by AddUserSkillCommand.
 */
export class AddUserSkillDTO {
  declare skill_id: number
  declare proficiency_level_id: number

  constructor(skillId: number, proficiencyLevelId: number) {
    this.skill_id = skillId
    this.proficiency_level_id = proficiencyLevelId
  }
}

/**
 * UpdateUserSkillDTO
 *
 * Data transfer object for updating a user's skill.
 * Used by UpdateUserSkillCommand.
 */
export class UpdateUserSkillDTO {
  declare user_skill_id: number
  declare proficiency_level_id: number

  constructor(userSkillId: number, proficiencyLevelId: number) {
    this.user_skill_id = userSkillId
    this.proficiency_level_id = proficiencyLevelId
  }
}

/**
 * RemoveUserSkillDTO
 *
 * Data transfer object for removing a skill from user's profile.
 * Used by RemoveUserSkillCommand.
 */
export class RemoveUserSkillDTO {
  declare user_skill_id: number

  constructor(userSkillId: number) {
    this.user_skill_id = userSkillId
  }
}
