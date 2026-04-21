import { organizationMembershipRepository } from '#composition/organizations/persistence/organization_persistence_composition'
import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'
import { userTalentRepository } from '#composition/users/user-persistence/user_persistence_composition'
import {
  ProjectRoleStaffingReader,
  type ProjectRoleStaffingCandidatePoolProjection,
  type ProjectRoleStaffingRoleProjection,
} from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import * as projectMemberQueries from '#modules/projects/infra/repositories/project-members/read/project_member_queries'
import GetUserStaffingCandidateProfilesQuery from '#modules/users/actions/queries/recruiting/get_user_staffing_candidate_profiles_query'

const staffingCandidates = new GetUserStaffingCandidateProfilesQuery(userTalentRepository)

export class ProjectRoleStaffingReaderAdapter extends ProjectRoleStaffingReader {
  async findRole(roleId: string): Promise<ProjectRoleStaffingRoleProjection | null> {
    const role = await skillPublicApi.findProjectProfessionalRoleById(roleId, true)
    if (!role) {
      return null
    }

    const requirements = role.role_skills.map((roleSkill) => {
      const normalizedWeight = Number.parseFloat(String(roleSkill.weight))
      return {
        skillId: roleSkill.projectSkill.skill_id,
        skillName: roleSkill.projectSkill.skill.skill_name,
        minimumLevelId: roleSkill.minimum_level_id,
        targetLevelId: roleSkill.target_level_id,
        assessmentCeilingLevelId: roleSkill.assessment_ceiling_level_id,
        isMandatory: roleSkill.is_mandatory,
        importance: roleSkill.importance,
        weight: Number.isFinite(normalizedWeight) ? normalizedWeight : 0,
      }
    })
    const levelIds = requirements.flatMap((requirement) =>
      [requirement.minimumLevelId, requirement.targetLevelId].filter(
        (levelId): levelId is string => levelId !== null
      )
    )
    const levels = await skillPublicApi.findProficiencyLevelsByIds([...new Set(levelIds)])

    return {
      id: role.id,
      projectId: role.project_id,
      name: role.name,
      code: role.code,
      requirements,
      levels: levels.map((level) => ({
        id: level.id,
        code: level.code,
        ordinal: level.ordinal,
      })),
    }
  }

  async loadCandidatePool(
    projectId: string,
    organizationId: string,
    requiredSkillIds: string[]
  ): Promise<ProjectRoleStaffingCandidatePoolProjection> {
    const [userProfiles, projectMemberUserIds, organizationMemberUserIds] = await Promise.all([
      staffingCandidates.execute(requiredSkillIds),
      projectMemberQueries.listMemberUserIds(projectId),
      organizationMembershipRepository.listMemberUserIds(organizationId, 'approved'),
    ])

    return {
      candidates: userProfiles.map((profile) => ({
        userId: profile.userId,
        username: profile.username,
        email: profile.email,
        skills: profile.skills,
        reviewedSkillsCount: profile.explainability?.reviewedSkillsCount ?? 0,
        importedSkillsCount: profile.explainability?.importedSkillsCount ?? 0,
        underDisputeSkillsCount: profile.explainability?.underDisputeSkillsCount ?? 0,
        latestConfidenceSignal: profile.explainability?.latestConfidenceSignal ?? null,
      })),
      projectMemberUserIds,
      organizationMemberUserIds,
    }
  }
}
