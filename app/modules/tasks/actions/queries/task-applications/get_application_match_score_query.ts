import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskApplicantMatchReader } from '#modules/tasks/actions/ports/outbound/task_applicant_match_reader'
import type { TaskPermissionReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/task_application_review_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import { calculateApplicantMatch, type MatchScoreResult } from '#modules/tasks/public_contracts/applicant_match'

export interface GetApplicationMatchScoreDTO {
  task_id: string
  application_id: string
}

export default class GetApplicationMatchScoreQuery extends BaseQuery<
  GetApplicationMatchScoreDTO,
  MatchScoreResult
> {
  constructor(
    execCtx: TaskActionContext,
    private readonly permissionReader: TaskPermissionReader,
    private readonly matches: TaskApplicantMatchReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetApplicationMatchScoreDTO): Promise<MatchScoreResult> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view task application match score')
    }

    const context = await this.matches.load(dto.task_id, dto.application_id)
    const taskRow = context.task

    if (!taskRow) {
      throw new NotFoundException('Task not found')
    }

    const [isProjectOwnerOrManager, isOrganizationOwnerOrAdmin] = await Promise.all([
      hasProjectApplicationReviewRole(userId, taskRow.project_id, this.permissionReader),
      hasOrganizationApplicationReviewRole(
        userId,
        taskRow.organization_id,
        this.permissionReader
      ),
    ])

    enforcePolicy(
      canProcessApplication({
        actorId: userId,
        taskCreatorId: taskRow.creator_id,
        action: 'reject',
        isTaskAlreadyAssigned: taskRow.assigned_to !== null,
        isProjectOwnerOrManager,
        isOrganizationOwnerOrAdmin,
      })
    )

    const applicant = context.applicants[0]
    if (!applicant) {
      throw new NotFoundException('Task application not found')
    }

    return calculateApplicantMatch(
      {
        requiredSkills: context.required_skills.map((rs) => ({
          skill_id: rs.skill_id,
          required_public_proficiency_code: rs.required_public_proficiency_code,
          is_mandatory: rs.is_mandatory,
          skill_name: rs.skill_name,
          minimumLevelId: rs.minimum_level_id,
          targetLevelId: rs.target_level_id,
          assessmentCeilingLevelId: rs.assessment_ceiling_level_id,
          importance: rs.importance ?? 'medium',
          weight: rs.weight ?? 1.0,
          projectSkillId: rs.project_skill_id,
          rubricVersionId: rs.rubric_version_id,
        })),
        business_domain: taskRow.business_domain,
        problem_category: taskRow.problem_category,
        task_type: taskRow.task_type,
      },
      {
        skills: applicant.skills.map((us) => ({
          skill_id: us.skill_id,
          verified_public_proficiency_code: us.verified_public_proficiency_code,
          source: us.source,
        })),
        workHistory: applicant.work_history.map((wh) => ({
          business_domain: wh.business_domain,
          problem_category: wh.problem_category,
          task_type: wh.task_type,
          was_on_time: wh.was_on_time,
        })),
        trustScore: applicant.trust_score,
      }
    )
  }
}
