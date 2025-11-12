import db from '@adonisjs/lucid/services/db'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/support/task_application_review_roles'
import { calculateApplicantMatch } from '#modules/tasks/domain/match_formulas'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'

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
  async handle(dto: GetTaskApplicationsRankingDTO): Promise<RankedApplication[]> {
    interface TaskRow {
      business_domain: string
      problem_category: string
      task_type: string
      project_id: string | null
      organization_id: string | null
      creator_id: string
      assigned_to: string | null
    }

    const userId = this.getCurrentUserId()
    if (!userId) {
      throw new ForbiddenException('Authentication required to view task application rankings')
    }

    const taskRow = (await db
      .from('tasks')
      .where('id', dto.task_id)
      .select(
        'business_domain',
        'problem_category',
        'task_type',
        'project_id',
        'organization_id',
        'creator_id',
        'assigned_to'
      )
      .first()) as TaskRow | null

    if (!taskRow) {
      throw new NotFoundException('Task not found')
    }

    const [isProjectOwnerOrManager, isOrganizationOwnerOrAdmin] = await Promise.all([
      hasProjectApplicationReviewRole(userId, taskRow.project_id),
      hasOrganizationApplicationReviewRole(userId, taskRow.organization_id),
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

    const applications = (await db
      .from('task_applications as ta')
      .join('users as u', 'u.id', 'ta.applicant_id')
      .where('ta.task_id', dto.task_id)
      .whereIn('ta.application_status', [
        ApplicationStatus.PENDING,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
      ])
      .select('ta.id as application_id', 'ta.applicant_id', 'u.username', 'u.trust_data')) as {
        application_id: string
        applicant_id: string
        username: string
        trust_data: unknown
      }[]
    const explainabilityByUserId = await userPublicApi.getTalentExplainabilitySummaryByUserId(
      applications.map((application) => application.applicant_id)
    )
    const applicantIds = applications.map((application) => application.applicant_id)

    const requiredSkills = (await db
      .from('task_required_skills as trs')
      .join('skills as s', 's.id', 'trs.skill_id')
      .where('trs.task_id', dto.task_id)
      .select(
        'trs.skill_id',
        'trs.required_public_proficiency_code',
        'trs.is_mandatory',
        's.skill_name',
        'trs.minimum_level_id',
        'trs.target_level_id',
        'trs.assessment_ceiling_level_id',
        'trs.importance',
        'trs.weight',
        'trs.project_skill_id',
        'trs.rubric_version_id'
      )) as {
        skill_id: string
        required_public_proficiency_code: string
        is_mandatory: boolean
        skill_name: string
        minimum_level_id: string | null
        target_level_id: string | null
        assessment_ceiling_level_id: string | null
        importance: string | null
        weight: number | null
        project_skill_id: string | null
        rubric_version_id: string | null
      }[]

    const [userSkillsRows, workHistoryRows, projectMemberRows, orgMemberRows] =
      applicantIds.length === 0
        ? [[], [], [], []]
        : await Promise.all([
            db
              .from('user_skills')
              .whereIn('user_id', applicantIds)
              .select('user_id', 'skill_id', 'verified_public_proficiency_code', 'source'),
            db
              .from('user_work_history')
              .whereIn('user_id', applicantIds)
              .select('user_id', 'business_domain', 'problem_category', 'task_type', 'was_on_time'),
            taskRow.project_id
              ? db
                  .from('project_members')
                  .where('project_id', taskRow.project_id)
                  .whereIn('user_id', applicantIds)
                  .select('user_id')
              : Promise.resolve([]),
            taskRow.organization_id
              ? db
                  .from('organization_users')
                  .where('organization_id', taskRow.organization_id)
                  .whereIn('user_id', applicantIds)
                  .where('status', OrganizationUserStatus.APPROVED)
                  .select('user_id')
              : Promise.resolve([]),
          ]) as [
            {
              user_id: string
              skill_id: string
              verified_public_proficiency_code: string
              source: string
            }[],
            {
              user_id: string
              business_domain: string
              problem_category: string
              task_type: string
              was_on_time: boolean
            }[],
            { user_id: string }[],
            { user_id: string }[],
          ]

    const userSkillsByApplicantId = new Map<string, typeof userSkillsRows>()
    for (const row of userSkillsRows) {
      const rows = userSkillsByApplicantId.get(row.user_id) ?? []
      rows.push(row)
      userSkillsByApplicantId.set(row.user_id, rows)
    }

    const workHistoryByApplicantId = new Map<string, typeof workHistoryRows>()
    for (const row of workHistoryRows) {
      const rows = workHistoryByApplicantId.get(row.user_id) ?? []
      rows.push(row)
      workHistoryByApplicantId.set(row.user_id, rows)
    }

    const projectMemberApplicantIds = new Set(projectMemberRows.map((row) => row.user_id))
    const orgMemberApplicantIds = new Set(orgMemberRows.map((row) => row.user_id))

    const ranked: RankedApplication[] = []

    for (const app of applications) {
      const userSkills = userSkillsByApplicantId.get(app.applicant_id) ?? []
      const workHistory = workHistoryByApplicantId.get(app.applicant_id) ?? []

      const trustData = (typeof app.trust_data === 'string'
        ? JSON.parse(app.trust_data)
        : (app.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const trustScore = trustData.calculated_score ?? 0

      const match = calculateApplicantMatch(
        {
          requiredSkills: requiredSkills.map((rs) => ({
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
          skills: userSkills.map((us) => ({
            skill_id: us.skill_id,
            verified_public_proficiency_code: us.verified_public_proficiency_code,
            source: us.source,
          })),
          workHistory: workHistory.map((wh) => ({
            business_domain: wh.business_domain,
            problem_category: wh.problem_category,
            task_type: wh.task_type,
            was_on_time: wh.was_on_time,
          })),
          trustScore,
        }
      )

      const candidateSource: CandidateSource = projectMemberApplicantIds.has(app.applicant_id)
        ? 'project_member'
        : orgMemberApplicantIds.has(app.applicant_id)
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
        applicant_name: app.username,
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
