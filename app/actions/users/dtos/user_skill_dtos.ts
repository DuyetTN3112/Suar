import type { DatabaseId } from '#types/database'

/**
 * AddUserSkillDTO
 *
 * Data transfer object for adding a skill to user's profile.
 * Used by AddUserSkillCommand.
 */
export class AddUserSkillDTO {
  declare skill_id: DatabaseId
  declare proficiency_level_id: DatabaseId

  constructor(skillId: DatabaseId, proficiencyLevelId: DatabaseId) {
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
  declare user_skill_id: DatabaseId
  declare proficiency_level_id: DatabaseId

  constructor(userSkillId: DatabaseId, proficiencyLevelId: DatabaseId) {
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
  declare user_skill_id: DatabaseId

  constructor(userSkillId: DatabaseId) {
    this.user_skill_id = userSkillId
  }
}
