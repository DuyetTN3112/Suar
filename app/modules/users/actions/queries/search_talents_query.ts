import db from '@adonisjs/lucid/services/db'

import { calculateApplicantMatch } from '../../../tasks/domain/match_formulas.js'
import { buildTalentExplainabilitySummaryByUserId } from '../support/talent_explainability_summary.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { normalizePagination, slicePageItems } from '#modules/pagination/public_contracts/pagination_public_api'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { TalentSearchCandidateReader } from '#modules/users/actions/ports/talent_search_candidate_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { USER_PAGINATION } from '#modules/users/application/dtos/common/user_pagination'

export interface SearchTalentsDTO {
  q?: string
  task_id?: string
  skill_categories?: string[] | null
  skill_ids?: string[] | null
  business_domain?: string | null
  task_type?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  sort_by?: 'relevance' | 'trust_score' | 'completed_tasks' | 'name'
  sort_order?: 'asc' | 'desc'
  saved?: boolean
  min_trust_score?: number
  min_completed_tasks?: number
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
  reviewed_skills_count?: number
  imported_skills_count?: number
  under_dispute_skills_count?: number
  latest_confidence_signal?: 'low' | 'medium' | 'high' | null
}

interface SearchTalentsQueryDeps {
  searchCandidateReader: TalentSearchCandidateReader
  buildExplainabilitySummary: typeof buildTalentExplainabilitySummaryByUserId
  fetchTalentUsersLegacy: (dto: SearchTalentsDTO) => Promise<TalentUserRow[]>
  fetchTalentUsersByIds: (userIds: string[], dto: SearchTalentsDTO) => Promise<TalentUserRow[]>
}

export default class SearchTalentsQuery extends BaseQuery<
  SearchTalentsDTO,
  TalentSearchResult[]
> {
  private readonly deps: SearchTalentsQueryDeps

  constructor(execCtx: UserActionContext, deps?: Partial<SearchTalentsQueryDeps>) {
    super(execCtx)
    if (!deps?.searchCandidateReader) {
      throw new Error('SearchTalentsQuery requires a searchCandidateReader port')
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      buildExplainabilitySummary: buildTalentExplainabilitySummaryByUserId,
      fetchTalentUsersLegacy: (dto) => this.fetchTalentUsersLegacy(dto),
      fetchTalentUsersByIds: (userIds, dto) => this.fetchTalentUsersByIds(userIds, dto),
      ...deps,
    }
  }

  async handle(dto: SearchTalentsDTO): Promise<TalentSearchResult[]> {
    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.per_page,
      },
      USER_PAGINATION
    )
    const users = await this.fetchTalentUsers(dto)
    const explainabilityByUserId = await this.deps.buildExplainabilitySummary(
      users.map((user) => user.id)
    )

    // 2. If task_id is specified, compute match scores and sort
    if (dto.task_id) {
      interface TaskRow {
        id: string
        business_domain: string
        problem_category: string
        task_type: string
      }

      const taskLookup = dto.task_id.trim()
      const taskQuery = db
        .from('tasks')
        .where((builder) => {
          void builder
            .whereRaw('id::text = ?', [taskLookup])
            .orWhereRaw('LOWER(title) = LOWER(?)', [taskLookup])
        })
        .whereNull('deleted_at')

      const organizationId = this.getCurrentOrganizationId()
      if (organizationId) {
        void taskQuery.where('organization_id', organizationId)
      }

      const taskRow = (await taskQuery
        .select('id', 'business_domain', 'problem_category', 'task_type')
        .orderByRaw('CASE WHEN id::text = ? THEN 0 ELSE 1 END', [taskLookup])
        .first()) as TaskRow | null

      if (!taskRow) {
        throw new NotFoundException('Task not found by id or title')
      }

      const requiredSkills = (await db
        .from('task_required_skills as trs')
        .join('skills as s', 's.id', 'trs.skill_id')
        .where('trs.task_id', taskRow.id)
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

      const talentUserIds = users.map((user) => user.id)
      const [userSkillsRows, workHistoryRows] =
        talentUserIds.length > 0
          ? await Promise.all([
              db
                .from('user_skills')
                .whereIn('user_id', talentUserIds)
                .select('user_id', 'skill_id', 'verified_public_proficiency_code', 'source'),
              db
                .from('user_work_history')
                .whereIn('user_id', talentUserIds)
                .select('user_id', 'business_domain', 'problem_category', 'task_type', 'was_on_time'),
            ])
          : [[], []]

      const userSkillsByUserId = new Map<
        string,
        {
          skill_id: string
          verified_public_proficiency_code: string
          source: string
        }[]
      >()
      for (const row of userSkillsRows as {
        user_id: string
        skill_id: string
        verified_public_proficiency_code: string
        source: string
      }[]) {
        const existing = userSkillsByUserId.get(row.user_id) ?? []
        existing.push({
          skill_id: row.skill_id,
          verified_public_proficiency_code: row.verified_public_proficiency_code,
          source: row.source,
        })
        userSkillsByUserId.set(row.user_id, existing)
      }

      const workHistoryByUserId = new Map<
        string,
        {
          business_domain: string
          problem_category: string
          task_type: string
          was_on_time: boolean
        }[]
      >()
      for (const row of workHistoryRows as {
        user_id: string
        business_domain: string
        problem_category: string
        task_type: string
        was_on_time: boolean
      }[]) {
        const existing = workHistoryByUserId.get(row.user_id) ?? []
        existing.push({
          business_domain: row.business_domain,
          problem_category: row.problem_category,
          task_type: row.task_type,
          was_on_time: row.was_on_time,
        })
        workHistoryByUserId.set(row.user_id, existing)
      }

      const results: TalentSearchResult[] = []

      for (const user of users) {
        const trustData = (typeof user.trust_data === 'string'
          ? JSON.parse(user.trust_data)
          : (user.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
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
            skills: (userSkillsByUserId.get(user.id) ?? []).map((us) => ({
              skill_id: us.skill_id,
              verified_public_proficiency_code: us.verified_public_proficiency_code,
              source: us.source,
            })),
            workHistory: (workHistoryByUserId.get(user.id) ?? []).map((wh) => ({
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
        const explainability = explainabilityByUserId.get(user.id)

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
          completed_tasks: user.external_contributor_completed_tasks_count,
          reviewed_skills_count: explainability?.reviewedSkillsCount ?? 0,
          imported_skills_count: explainability?.importedSkillsCount ?? 0,
          under_dispute_skills_count: explainability?.underDisputeSkillsCount ?? 0,
          latest_confidence_signal: explainability?.latestConfidenceSignal ?? null,
        })
      }

      return results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    }

    // 3. Otherwise return simple list with pagination
    const paginatedUsers = slicePageItems(users, pagination)

    return paginatedUsers.map((u) => {
      const trustData = (typeof u.trust_data === 'string'
        ? JSON.parse(u.trust_data)
        : (u.trust_data ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const profileSettings = (typeof u.profile_settings === 'string'
        ? JSON.parse(u.profile_settings)
        : (u.profile_settings ?? {})) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>
      const explainability = explainabilityByUserId.get(u.id)

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
        completed_tasks: u.external_contributor_completed_tasks_count,
        reviewed_skills_count: explainability?.reviewedSkillsCount ?? 0,
        imported_skills_count: explainability?.importedSkillsCount ?? 0,
        under_dispute_skills_count: explainability?.underDisputeSkillsCount ?? 0,
        latest_confidence_signal: explainability?.latestConfidenceSignal ?? null,
      }
    })
  }

  private async fetchTalentUsers(dto: SearchTalentsDTO): Promise<TalentUserRow[]> {
    if (dto.q?.trim() && isSearchRuntimeEnabled()) {
      try {
        const pagination = normalizePagination(
          {
            page: dto.page,
            perPage: dto.per_page,
          },
          USER_PAGINATION
        )
        const limit = Math.max(pagination.page * pagination.perPage, USER_PAGINATION.DEFAULT_PER_PAGE)
        const engineResults = await this.deps.searchCandidateReader.searchTalentCandidates({
          q: dto.q,
          limit,
        })

        if (engineResults.length === 0) {
          return this.deps.fetchTalentUsersLegacy(dto)
        }

        const users = await this.deps.fetchTalentUsersByIds(
          engineResults.map((result) => result.userId),
          dto
        )
        if (users.length === 0) {
          return this.deps.fetchTalentUsersLegacy(dto)
        }

        const order = new Map(engineResults.map((result, index) => [result.userId, index]))
        return users.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
      } catch {
        return this.deps.fetchTalentUsersLegacy(dto)
      }
    }

    return this.deps.fetchTalentUsersLegacy(dto)
  }

  private async fetchTalentUsersLegacy(dto: SearchTalentsDTO): Promise<TalentUserRow[]> {
    const query = db
      .from('users')
      .where('status', 'active')
      .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

    if (dto.q) {
      void query.where('username', 'ilike', `%${dto.q}%`)
    }

    this.applyTalentDiscoveryFilters(query, dto)

    return this.selectTalentUsers(query)
  }

  private async fetchTalentUsersByIds(
    userIds: string[],
    dto: SearchTalentsDTO
  ): Promise<TalentUserRow[]> {
    if (userIds.length === 0) {
      return []
    }

    const query = db
      .from('users')
      .whereIn('id', userIds)
      .where('status', 'active')
      .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

    this.applyTalentDiscoveryFilters(query, dto)

    return this.selectTalentUsers(query)
  }

  private applyTalentDiscoveryFilters(
    query: ReturnType<typeof db.from>,
    dto: SearchTalentsDTO
  ): void {
    if (dto.skill_categories && dto.skill_categories.length > 0) {
      void query.whereExists((builder) => {
        void builder
          .from('user_skills as us')
          .join('skills as s', 's.id', 'us.skill_id')
          .whereColumn('us.user_id', 'users.id')
          .whereIn('s.category_code', dto.skill_categories ?? [])
      })
    }

    if (dto.skill_ids && dto.skill_ids.length > 0) {
      void query.whereExists((builder) => {
        void builder
          .from('user_skills as us')
          .whereColumn('us.user_id', 'users.id')
          .whereIn('us.skill_id', dto.skill_ids ?? [])
      })
    }

    if (dto.business_domain) {
      const businessDomain = dto.business_domain
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.business_domain', businessDomain)
      })
    }

    if (dto.task_type) {
      const taskType = dto.task_type
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.task_type', taskType)
      })
    }

    if (dto.problem_category) {
      const problemCategory = dto.problem_category
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.problem_category', problemCategory)
      })
    }

    if (dto.role_in_task) {
      const roleInTask = dto.role_in_task
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.role_in_task', roleInTask)
      })
    }

    const techStack = dto.tech_stack?.trim().toLowerCase()
    if (techStack) {
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .whereRaw('LOWER(uwh.tech_stack::text) LIKE ?', [`%${techStack}%`])
      })
    }

    const domainTags = dto.domain_tags?.trim().toLowerCase()
    if (domainTags) {
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .whereRaw('LOWER(uwh.domain_tags::text) LIKE ?', [`%${domainTags}%`])
      })
    }
  }

  private async selectTalentUsers(
    query: ReturnType<typeof db.from>
  ): Promise<TalentUserRow[]> {
    return (await query.select(
      'id',
      'username',
      'status',
      'trust_data',
      'avatar_url',
      'bio',
      'profile_settings',
      'is_external_contributor',
      'external_contributor_completed_tasks_count'
    )) as TalentUserRow[]
  }
}

interface TalentUserRow {
  id: string
  username: string
  status: string
  trust_data: unknown
  avatar_url: string | null
  bio: string | null
  profile_settings: unknown
  is_external_contributor: boolean
  external_contributor_completed_tasks_count: number
}
