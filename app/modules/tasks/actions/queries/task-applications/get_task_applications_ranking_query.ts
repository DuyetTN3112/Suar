import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskApplicantMatchReader } from '#modules/tasks/actions/ports/outbound/task_applicant_match_reader'
import type {
  TaskPermissionReader,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/task_application_review_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import { calculateApplicantMatch } from '#modules/tasks/public_contracts/applicant_match'

type CandidateSource = 'project_member' | 'org_member' | 'external'

export interface GetTaskApplicationsRankingDTO {
  task_id: string
}

export interface RankedApplication {
  application_id: string
  applicant_id: string
  applicant_name: string
  match_score: number
  skill_match: number
  domain_match: number
  delivery_reliability: number
  trust_score: number
  evidence_confidence: 'low' | 'medium' | 'high'
  evidence_warnings: string[]
  explanations: string[]
  risks: string[]
  candidate_source: CandidateSource
  fit_label: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
}

export default class GetTaskApplicationsRankingQuery extends BaseQuery<
  GetTaskApplicationsRankingDTO,
  RankedApplication[]
> {
  constructor(
    execCtx: TaskActionContext,
    private readonly talentReader: Pick<TaskUserReader, 'getTalentExplainabilitySummaries'>,
    private readonly permissionReader: TaskPermissionReader,
    private readonly matches: TaskApplicantMatchReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetTaskApplicationsRankingDTO): Promise<RankedApplication[]> {
    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view task application rankings')
    }

    const context = await this.matches.load(dto.task_id)
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

    const applications = context.applicants
    const explainabilityByUserId = await this.talentReader.getTalentExplainabilitySummaries(
      applications.map((application) => application.applicant_id)
    )
    const ranked: RankedApplication[] = []

    for (const app of applications) {
      const match = calculateApplicantMatch(
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
            weight: rs.weight ?? 1,
            projectSkillId: rs.project_skill_id,
            rubricVersionId: rs.rubric_version_id,
          })),
          business_domain: taskRow.business_domain,
          problem_category: taskRow.problem_category,
          task_type: taskRow.task_type,
        },
        {
          skills: app.skills.map((us) => ({
            skill_id: us.skill_id,
            verified_public_proficiency_code: us.verified_public_proficiency_code,
            source: us.source,
          })),
          workHistory: app.work_history.map((wh) => ({
            business_domain: wh.business_domain,
            problem_category: wh.problem_category,
            task_type: wh.task_type,
            was_on_time: wh.was_on_time,
          })),
          trustScore: app.trust_score,
        }
      )

      const candidateSource: CandidateSource = app.is_project_member
        ? 'project_member'
        : app.is_organization_member
          ? 'org_member'
          : 'external'

      const fitLabel: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match' =
        match.match_score >= 80 ? 'strong_match'
        : match.match_score >= 60 ? 'good_match'
        : match.match_score >= 40 ? 'partial_match'
        : 'weak_match'

      ranked.push({
        application_id: app.application_id,
        applicant_id: app.applicant_id,
        applicant_name: app.applicant_name,
        ...match,
        candidate_source: candidateSource,
        fit_label: fitLabel,
        reviewed_skills_count:
          explainabilityByUserId.get(app.applicant_id)?.reviewedSkillsCount ?? 0,
        imported_skills_count:
          explainabilityByUserId.get(app.applicant_id)?.importedSkillsCount ?? 0,
        under_dispute_skills_count:
          explainabilityByUserId.get(app.applicant_id)?.underDisputeSkillsCount ?? 0,
        latest_confidence_signal:
          explainabilityByUserId.get(app.applicant_id)?.latestConfidenceSignal ?? null,
      })
    }

    return ranked.sort((a, b) => b.match_score - a.match_score)
  }
}
