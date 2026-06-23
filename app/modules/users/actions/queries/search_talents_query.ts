import db from '@adonisjs/lucid/services/db'

import { calculateApplicantMatch } from '../../../tasks/domain/match_formulas.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'

export interface SearchTalentsDTO {
  q?: string
  task_id?: string
  page?: number
  per_page?: number
}

export interface TalentSearchResult {
  id: string
  username: string
  status: string
  match_score?: number
  skill_match?: number
  domain_match?: number
  delivery_reliability?: number
  trust_score?: number
  explanations?: string[]
  risks?: string[]
  avatar_url?: string | null
  bio?: string | null
  custom_headline?: string | null
  completed_tasks?: number
}

export default class SearchTalentsQuery extends BaseQuery<
  SearchTalentsDTO,
  TalentSearchResult[]
> {
  async handle(dto: SearchTalentsDTO): Promise<TalentSearchResult[]> {
    // 1. Fetch matching active, searchable users
    const query = db
      .from('users')
      .where('status', 'active')
      .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

    if (dto.q) {
      void query.where('username', 'ilike', `%${dto.q}%`)
    }

    const users = (await query.select(
      'id',
      'username',
      'status',
      'trust_data',
      'avatar_url',
      'bio',
      'profile_settings',
      'is_freelancer',
      'freelancer_completed_tasks_count'
    )) as {
      id: string
      username: string
      status: string
      trust_data: unknown
      avatar_url: string | null
      bio: string | null
      profile_settings: unknown
      is_freelancer: boolean
      freelancer_completed_tasks_count: number
    }[]

    // 2. If task_id is specified, compute match scores and sort
    if (dto.task_id) {
      interface TaskRow {
        business_domain: string
        problem_category: string
        task_type: string
      }

      const taskRow = (await db
        .from('tasks')
        .where('id', dto.task_id)
        .select('business_domain', 'problem_category', 'task_type')
        .first()) as TaskRow | null

      if (!taskRow) {
        throw new NotFoundException('Task not found')
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

      const results: TalentSearchResult[] = []

      for (const user of users) {
        const userSkills = (await db
          .from('user_skills')
          .where('user_id', user.id)
          .select('skill_id', 'level_code', 'source')) as {
            skill_id: string
            level_code: string
            source: string
          }[]

        const workHistory = (await db
          .from('user_work_history')
          .where('user_id', user.id)
          .select('business_domain', 'problem_category', 'task_type', 'was_on_time')) as {
            business_domain: string
            problem_category: string
            task_type: string
            was_on_time: boolean
          }[]

        const trustData = (typeof user.trust_data === 'string'
          ? JSON.parse(user.trust_data)
          : (user.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
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

        const profileSettings = (typeof user.profile_settings === 'string'
          ? JSON.parse(user.profile_settings)
          : (user.profile_settings ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>

        results.push({
          id: user.id,
          username: user.username,
          status: user.status,
          match_score: match.match_score,
          skill_match: match.skill_match,
          domain_match: match.domain_match,
          delivery_reliability: match.delivery_reliability,
          trust_score: match.trust_score,
          explanations: match.explanations,
          risks: match.risks,
          avatar_url: user.avatar_url,
          bio: user.bio,
          custom_headline: profileSettings.custom_headline ?? null,
          completed_tasks: user.freelancer_completed_tasks_count,
        })
      }

      return results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    }

    // 3. Otherwise return simple list with pagination
    const page = dto.page ?? 1
    const perPage = dto.per_page ?? 20
    const offset = (page - 1) * perPage
    const paginatedUsers = users.slice(offset, offset + perPage)

    return paginatedUsers.map((u) => {
      const trustData = (typeof u.trust_data === 'string'
        ? JSON.parse(u.trust_data)
        : (u.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const profileSettings = (typeof u.profile_settings === 'string'
        ? JSON.parse(u.profile_settings)
        : (u.profile_settings ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>

      return {
        id: u.id,
        username: u.username,
        status: u.status,
        trust_score: trustData.calculated_score ?? 0,
        skill_match: trustData.performance_breakdown?.quality_score ?? 0,
        domain_match: trustData.performance_breakdown?.consistency_score ?? 0,
        delivery_reliability: trustData.performance_score ?? trustData.performance_breakdown?.delivery_score ?? 0,
        avatar_url: u.avatar_url,
        bio: u.bio,
        custom_headline: profileSettings.custom_headline ?? null,
        completed_tasks: u.freelancer_completed_tasks_count,
      }
    })
  }
}
