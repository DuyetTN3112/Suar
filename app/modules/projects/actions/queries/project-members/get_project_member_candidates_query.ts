import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/projects/actions/base_query'
import type {
  ProjectOrganizationReader,
  ProjectUserReader,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMemberCandidateReader } from '#modules/projects/actions/ports/outbound/project_member_candidate_reader'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import {
  canAccessProjectOrganizationScope,
  canManageProjectMembers,
} from '#modules/projects/domain/project-members/project_permission_policy'

export interface GetProjectMemberCandidatesDTO {
  project_id: string
  search?: string
}

export interface ProjectMemberCandidate {
  user_id: string
  username: string
  email: string
  org_role: string
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
}

export default class GetProjectMemberCandidatesQuery extends BaseQuery<
  GetProjectMemberCandidatesDTO,
  ProjectMemberCandidate[]
> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly organizationReader: ProjectOrganizationReader,
    private readonly userReader: ProjectUserReader,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly candidates: ProjectMemberCandidateReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetProjectMemberCandidatesDTO): Promise<ProjectMemberCandidate[]> {
    const actorUserId = this.getCurrentUserId()
    if (!actorUserId) {
      throw new UnauthorizedException()
    }

    const currentOrganizationId = this.getCurrentOrganizationId()
    if (!currentOrganizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const project = await this.projects
      .findDetail(dto.project_id)
      .catch(() => {
        throw new NotFoundException('Project not found')
      })

    enforcePolicy(
      canAccessProjectOrganizationScope({
        requestedOrganizationId: currentOrganizationId,
        projectOrganizationId: project.organization_id,
      })
    )

    const [actorOrgRole, actorProjectRole] = await Promise.all([
      this.organizationReader.getMembershipRole(project.organization_id, actorUserId),
      this.memberships
        .getRoleName(dto.project_id, actorUserId)
        .then((role) => (role === 'unknown' ? null : role)),
    ])

    enforcePolicy(
      canManageProjectMembers({
        actorId: actorUserId,
        actorOrgRole,
        actorProjectRole,
        projectOwnerId: project.owner_id ?? '',
        projectCreatorId: project.creator_id,
        projectOrganizationId: project.organization_id,
      })
    )

    const rows = await this.candidates.listApprovedNonMembers(
      dto.project_id,
      project.organization_id
    )
    const filteredRows = rows.filter((row) => {
        if (!dto.search || dto.search.trim().length === 0) return true
        const term = dto.search.trim().toLowerCase()
        return (
          row.username.toLowerCase().includes(term) ||
          row.email.toLowerCase().includes(term)
        )
      })

    const explainabilityByUserId = await this.userReader.findTalentExplainabilitySummaries(
      filteredRows.map((row) => row.userId)
    )

    return filteredRows.map((row) => ({
      user_id: row.userId,
      username: row.username,
      email: row.email,
      org_role: row.organizationRole,
      reviewed_skills_count:
        explainabilityByUserId.get(row.userId)?.reviewedSkillsCount ?? 0,
      imported_skills_count: explainabilityByUserId.get(row.userId)?.importedSkillsCount ?? 0,
      under_dispute_skills_count:
        explainabilityByUserId.get(row.userId)?.underDisputeSkillsCount ?? 0,
      latest_confidence_signal:
        explainabilityByUserId.get(row.userId)?.latestConfidenceSignal ?? null,
    }))
  }
}
