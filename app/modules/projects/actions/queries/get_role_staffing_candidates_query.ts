import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type { ProjectRoleStaffingReader } from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type GetUserProjectAccessQuery from '#modules/projects/actions/queries/get_user_project_access_query'

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
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
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

export default class GetRoleStaffingCandidatesQuery extends BaseQuery<
  GetRoleStaffingCandidatesDTO,
  GetRoleStaffingCandidatesResult
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly access: GetUserProjectAccessQuery,
    private readonly staffingReader: ProjectRoleStaffingReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetRoleStaffingCandidatesDTO): Promise<GetRoleStaffingCandidatesResult> {
    const actorUserId = this.getCurrentUserId()
    if (!actorUserId) {
      throw new UnauthorizedException()
    }

    const currentOrganizationId = this.getCurrentOrganizationId()
    if (!currentOrganizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    await this.access.handle({
      projectId: dto.project_id,
      userId: actorUserId,
      organizationId: currentOrganizationId,
      writeMode: true,
    })

    const role = await this.staffingReader.findRole(dto.role_id)
    if (role?.projectId !== dto.project_id) {
      throw new NotFoundException('Role not found in project')
    }

    const requirements: RoleSkillRequirement[] = role.requirements.map((requirement) => ({
      skill_id: requirement.skillId,
      skill_name: requirement.skillName,
      minimum_level_id: requirement.minimumLevelId,
      target_level_id: requirement.targetLevelId,
      assessment_ceiling_level_id: requirement.assessmentCeilingLevelId,
      is_mandatory: requirement.isMandatory,
      importance: requirement.importance,
      weight: requirement.weight,
    }))

    if (requirements.length === 0) {
      return {
        role: { id: role.id, name: role.name, code: role.code },
        requirements: [],
        candidates: [],
        project_members: [],
        org_members: [],
      }
    }

    const requiredSkillIds = requirements.map((r) => r.skill_id)
    const candidatePool = await this.staffingReader.loadCandidatePool(
      dto.project_id,
      currentOrganizationId,
      requiredSkillIds
    )
    const projectMemberIds = new Set(candidatePool.projectMemberUserIds)
    const orgMemberIds = new Set(candidatePool.organizationMemberUserIds)
    const levelOrdinalMap = new Map(role.levels.map((level) => [level.id, level.ordinal]))
    const levelCodeOrdinalMap = new Map(role.levels.map((level) => [level.code, level.ordinal]))

    const candidates: StaffingCandidate[] = []

    for (const candidate of candidatePool.candidates) {
      const userSkills = new Map(
        candidate.skills.map((skill) => [skill.skillId, skill.proficiencyCode])
      )
      let matchedSkills = 0
      const skillGaps: string[] = []
      let totalScore = 0
      let maxScore = 0

      for (const req of requirements) {
        const userLevelCode = userSkills.get(req.skill_id)
        const userOrdinal = userLevelCode ? (levelCodeOrdinalMap.get(userLevelCode) ?? 0) : 0
        const targetOrdinal = req.target_level_id
          ? (levelOrdinalMap.get(req.target_level_id) ?? 0)
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
      if (projectMemberIds.has(candidate.userId)) {
        source = 'project_member'
      } else if (orgMemberIds.has(candidate.userId)) {
        source = 'org_member'
      }

      candidates.push({
        user_id: candidate.userId,
        username: candidate.username,
        email: candidate.email,
        source,
        match_score: matchScore,
        matched_skills: matchedSkills,
        total_required_skills: requirements.length,
        skill_gaps: skillGaps,
        reviewed_skills_count: candidate.reviewedSkillsCount,
        imported_skills_count: candidate.importedSkillsCount,
        under_dispute_skills_count: candidate.underDisputeSkillsCount,
        latest_confidence_signal: candidate.latestConfidenceSignal,
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
