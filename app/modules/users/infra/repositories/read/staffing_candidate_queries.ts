import db from '@adonisjs/lucid/services/db'

export interface StaffingCandidateIdentitySkillRow {
  user_id: string
  username: string
  email: string
  skill_id: string
  verified_public_proficiency_code: string
}

export const findIdentitySkillsBySkillIds = async (
  skillIds: string[]
): Promise<StaffingCandidateIdentitySkillRow[]> => {
  if (skillIds.length === 0) {
    return []
  }

  return db
    .from('user_skills as us')
    .join('users as u', 'u.id', 'us.user_id')
    .whereIn('us.skill_id', skillIds)
    .select(
      'us.user_id',
      'u.username',
      'u.email',
      'us.skill_id',
      'us.verified_public_proficiency_code'
    )
}
