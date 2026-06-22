import db from '@adonisjs/lucid/services/db'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { calculateApplicantMatch } from '#modules/tasks/domain/match_formulas'

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
  explanations: string[]
  risks: string[]
  candidate_source: 'project_member' | 'org_member' | 'external'
  fit_label: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
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
    }

    const taskRow = (await db
      .from('tasks')
      .where('id', dto.task_id)
      .select('business_domain', 'problem_category', 'task_type', 'project_id')
      .first()) as TaskRow | null

    if (!taskRow) {
      throw new NotFoundException('Task not found')
    }

    const applications = (await db
      .from('task_applications as ta')
      .join('users as u', 'u.id', 'ta.applicant_id')
      .where('ta.task_id', dto.task_id)
      .whereIn('ta.application_status', ['pending', 'approved'])
      .select('ta.id as application_id', 'ta.applicant_id', 'u.username', 'u.trust_data')) as {
        application_id: string
        applicant_id: string
        username: string
        trust_data: unknown
      }[]

    const requiredSkills = (await db
      .from('task_required_skills as trs')
      .join('skills as s', 's.id', 'trs.skill_id')
      .where('trs.task_id', dto.task_id)
      .select(
        'trs.skill_id',
        'trs.required_level_code',
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
        required_level_code: string
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

    const ranked: RankedApplication[] = []

    for (const app of applications) {
      const userSkills = (await db
        .from('user_skills')
        .where('user_id', app.applicant_id)
        .select('skill_id', 'level_code', 'source')) as {
          skill_id: string
          level_code: string
          source: string
        }[]

      const workHistory = (await db
        .from('user_work_history')
        .where('user_id', app.applicant_id)
        .select('business_domain', 'problem_category', 'task_type', 'was_on_time')) as {
          business_domain: string
          problem_category: string
          task_type: string
          was_on_time: boolean
        }[]

      const trustData = (typeof app.trust_data === 'string'
        ? JSON.parse(app.trust_data)
        : (app.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const trustScore = trustData.calculated_score ?? 0

      const match = calculateApplicantMatch(
        {
          requiredSkills: requiredSkills.map((rs) => ({
            skill_id: rs.skill_id,
            required_level_code: rs.required_level_code,
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
            level_code: us.level_code,
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

      // Determine candidate source
      let candidateSource: 'project_member' | 'org_member' | 'external' = 'external'
      if (taskRow.project_id) {
        const pmCheck = (await db
          .from('project_members')
          .where('project_id', taskRow.project_id)
          .where('user_id', app.applicant_id)
          .first()) as { user_id: string } | null
        if (pmCheck) {
          candidateSource = 'project_member'
        } else {
          const orgCheck = (await db
            .from('organization_users as ou')
            .join('projects as p', 'p.organization_id', 'ou.organization_id')
            .where('p.id', taskRow.project_id)
            .where('ou.user_id', app.applicant_id)
            .where('ou.status', 'approved')
            .first()) as { user_id: string } | null
          if (orgCheck) {
            candidateSource = 'org_member'
          }
        }
      }

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
      })
    }

    return ranked.sort((a, b) => b.match_score - a.match_score)
  }
}
