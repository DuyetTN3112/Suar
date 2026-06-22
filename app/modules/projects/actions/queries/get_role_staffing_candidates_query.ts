import db from '@adonisjs/lucid/services/db'

import { BaseQuery } from '#modules/projects/actions/base_query'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export interface GetRoleStaffingCandidatesDTO {
  project_id: string
  role_id: string
}

export interface RoleSkillRequirement {
  skill_id: string
  skill_name: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  is_mandatory: boolean
  importance: string
  weight: number
}

export interface StaffingCandidate {
  user_id: string
  username: string
  email: string
  source: 'project_member' | 'org_member' | 'external'
  match_score: number
  matched_skills: number
  total_required_skills: number
  skill_gaps: string[]
}

export interface GetRoleStaffingCandidatesResult {
  role: {
    id: string
    name: string
    code: string
  }
  requirements: RoleSkillRequirement[]
  candidates: StaffingCandidate[]
  project_members: StaffingCandidate[]
  org_members: StaffingCandidate[]
}

interface UserSkillRow {
  user_id: string
  skill_id: string
  level_code: string
  username: string
  email: string
}

interface ProficiencyLevelRow {
  id: string
  ordinal: number
  code: string
}

export default class GetRoleStaffingCandidatesQuery extends BaseQuery<
  GetRoleStaffingCandidatesDTO,
  GetRoleStaffingCandidatesResult
> {
  async handle(dto: GetRoleStaffingCandidatesDTO): Promise<GetRoleStaffingCandidatesResult> {
    const role = await ProfessionalRoleRepository.findProjectRoleById(dto.role_id, true)
    if (role?.project_id !== dto.project_id) {
      throw new Error('Role not found in project')
    }

    const roleSkills = role.role_skills
    const requirements: RoleSkillRequirement[] = []

    for (const rs of roleSkills) {
      const projectSkill = rs.projectSkill
      const skillId = projectSkill.skill_id
      const skillName = projectSkill.skill.skill_name
      requirements.push({
        skill_id: skillId,
        skill_name: skillName,
        minimum_level_id: rs.minimum_level_id,
        target_level_id: rs.target_level_id,
        assessment_ceiling_level_id: rs.assessment_ceiling_level_id,
        is_mandatory: rs.is_mandatory,
        importance: rs.importance,
        weight: rs.weight,
      })
    }

    if (requirements.length === 0) {
      return {
        role: { id: role.id, name: role.name, code: role.code },
        requirements: [],
        candidates: [],
        project_members: [],
        org_members: [],
      }
    }

    // Get project member IDs
    const projectMemberRows = await db
      .from('project_members')
      .where('project_id', dto.project_id)
      .select('user_id') as unknown as { user_id: string }[]
    const projectMemberIds = new Set(projectMemberRows.map((row) => row.user_id))

    // Get org member IDs
    const orgMemberRows = await db
      .from('organization_users')
      .where('organization_id', role.project_id)
      .where('status', 'approved')
      .select('user_id')
    const orgMemberIds = new Set(
      (orgMemberRows as { user_id: string }[]).map((row) => row.user_id)
    )

    // Get all users who have at least one of the required skills
    const requiredSkillIds = requirements.map((r) => r.skill_id)
    const userSkills = (await db
      .from('user_skills as us')
      .join('users as u', 'u.id', 'us.user_id')
      .whereIn('us.skill_id', requiredSkillIds)
      .select('us.user_id', 'us.skill_id', 'us.level_code', 'u.username', 'u.email')) as UserSkillRow[]

    // Group by user
    const userMap = new Map<string, { username: string; email: string; skills: Map<string, string> }>()
    for (const row of userSkills) {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, { username: row.username, email: row.email, skills: new Map() })
      }
      const userEntry = userMap.get(row.user_id)
      if (!userEntry) {
        continue
      }
      userEntry.skills.set(row.skill_id, row.level_code)
    }

    // Build level ordinal map for scoring
    const levelRows = (await db
      .from('proficiency_levels')
      .whereIn(
        'id',
        requirements.flatMap((r) => [r.minimum_level_id, r.target_level_id].filter(Boolean) as string[])
      )
      .select('id', 'ordinal', 'code')) as ProficiencyLevelRow[]
    const levelOrdinalMap = new Map(levelRows.map((level) => [level.id, level.ordinal]))
    const levelCodeOrdinalMap = new Map(levelRows.map((level) => [level.code, level.ordinal]))

    const candidates: StaffingCandidate[] = []

    for (const [userId, userData] of userMap) {
      let matchedSkills = 0
      const skillGaps: string[] = []
      let totalScore = 0
      let maxScore = 0

      for (const req of requirements) {
        const userLevelCode = userData.skills.get(req.skill_id)
        const userOrdinal = userLevelCode
          ? levelCodeOrdinalMap.get(userLevelCode) ?? 0
          : 0
        const targetOrdinal = req.target_level_id
          ? levelOrdinalMap.get(req.target_level_id) ?? 0
          : 0

        maxScore += req.weight * 100

        if (userOrdinal >= targetOrdinal && targetOrdinal > 0) {
          matchedSkills++
          totalScore += req.weight * 100
        } else if (userOrdinal > 0 && targetOrdinal > 0) {
          const ratio = userOrdinal / targetOrdinal
          totalScore += req.weight * 100 * ratio
          if (req.is_mandatory) {
            skillGaps.push(req.skill_name)
          }
        } else {
          if (req.is_mandatory) {
            skillGaps.push(req.skill_name)
          }
        }
      }

      const matchScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

      let source: 'project_member' | 'org_member' | 'external' = 'external'
      if (projectMemberIds.has(userId)) {
        source = 'project_member'
      } else if (orgMemberIds.has(userId)) {
        source = 'org_member'
      }

      candidates.push({
        user_id: userId,
        username: userData.username,
        email: userData.email,
        source,
        match_score: matchScore,
        matched_skills: matchedSkills,
        total_required_skills: requirements.length,
        skill_gaps: skillGaps,
      })
    }

    candidates.sort((a, b) => b.match_score - a.match_score)

    return {
      role: { id: role.id, name: role.name, code: role.code },
      requirements,
      candidates,
      project_members: candidates.filter((c) => c.source === 'project_member'),
      org_members: candidates.filter((c) => c.source === 'org_member'),
    }
  }
}
