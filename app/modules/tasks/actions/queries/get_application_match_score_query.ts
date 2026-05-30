import db from '@adonisjs/lucid/services/db'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import { calculateApplicantMatch, type MatchScoreResult } from '#modules/tasks/domain/match_formulas'

interface TaskRow {
  business_domain: string
  problem_category: string
  task_type: string
}

interface AppRow {
  applicant_id: string
}

interface UserRow {
  trust_data: unknown
}

interface TaskRequiredSkillRow {
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
}

interface UserSkillRow {
  skill_id: string
  level_code: string
  source: string
}

interface WorkHistoryRow {
  business_domain: string
  problem_category: string
  task_type: string
  was_on_time: boolean
}

export interface GetApplicationMatchScoreDTO {
  task_id: string
  application_id: string
}

export default class GetApplicationMatchScoreQuery extends BaseQuery<
  GetApplicationMatchScoreDTO,
  MatchScoreResult
> {
  async handle(dto: GetApplicationMatchScoreDTO): Promise<MatchScoreResult> {
    const taskRow = (await db
      .from('tasks')
      .where('id', dto.task_id)
      .select('business_domain', 'problem_category', 'task_type')
      .first()) as TaskRow | null

    if (!taskRow) {
      throw new NotFoundException('Task not found')
    }

    const appRow = (await db
      .from('task_applications')
      .where('id', dto.application_id)
      .select('applicant_id')
      .first()) as AppRow | null

    if (!appRow) {
      throw new NotFoundException('Task application not found')
    }

    const applicant = (await db
      .from('users')
      .where('id', appRow.applicant_id)
      .select('trust_data')
      .first()) as UserRow | null

    if (!applicant) {
      throw new NotFoundException('Applicant not found')
    }

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
      )) as TaskRequiredSkillRow[]

    const userSkills = (await db
      .from('user_skills')
      .where('user_id', appRow.applicant_id)
      .select('skill_id', 'level_code', 'source')) as UserSkillRow[]

    const workHistory = (await db
      .from('user_work_history')
      .where('user_id', appRow.applicant_id)
      .select('business_domain', 'problem_category', 'task_type', 'was_on_time')) as WorkHistoryRow[]

    const trustData = (typeof applicant.trust_data === 'string'
      ? JSON.parse(applicant.trust_data)
      : (applicant.trust_data ?? {})) as { calculated_score?: unknown }
    const trustScore = Number(trustData.calculated_score ?? 0)

    return calculateApplicantMatch(
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
          weight: rs.weight ?? 1.0,
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
  }
}
