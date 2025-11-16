import db from '@adonisjs/lucid/services/db'

import { toOffset } from '#modules/pagination/public_contracts/pagination_public_api'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
import { buildTalentExplainabilitySummaryByUserId } from '#modules/users/actions/support/talent_explainability_summary'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { EngineTalentSearchCandidateReader } from '#modules/users/infra/adapters/engine_talent_search_candidate_reader'

export function makeSearchTalentsQuery(execCtx: UserActionContext): SearchTalentsQuery {
  return new SearchTalentsQuery(execCtx, {
    searchCandidateReader: new EngineTalentSearchCandidateReader(),
  })
}

export function makeGetTalentDirectoryPageQuery(
  execCtx: UserActionContext
): GetTalentDirectoryPageQuery {
  return new GetTalentDirectoryPageQuery(execCtx, {
    searchTalents: (dto) => makeSearchTalentsQuery(execCtx).handle(dto),
    fetchTalentPage: async ({
      q,
      skillCategories,
      skillIds,
      businessDomain,
      taskType,
      problemCategory,
      roleInTask,
      techStack,
      domainTags,
      sortBy,
      sortOrder,
      saved,
      minTrustScore,
      minCompletedTasks,
      recruiterUserId,
      page,
      perPage,
    }) => {
      let query = db
        .from('users')
        .where('status', 'active')
        .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

      if (q?.trim()) {
        const keyword = '%' + q.trim() + '%'
        query = query.where((builder) => {
          void builder
            .where('username', 'ilike', keyword)
            .orWhere('bio', 'ilike', keyword)
            .orWhereRaw("profile_settings->>'custom_headline' ilike ?", [keyword])
        })
      }

      if (skillCategories && skillCategories.length > 0) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_skills as us')
            .join('skills as s', 's.id', 'us.skill_id')
            .whereColumn('us.user_id', 'users.id')
            .whereIn('s.category_code', skillCategories)
        })
      }

      if (skillIds && skillIds.length > 0) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_skills as us')
            .whereColumn('us.user_id', 'users.id')
            .whereIn('us.skill_id', skillIds)
        })
      }

      if (businessDomain) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .where('uwh.business_domain', businessDomain)
        })
      }

      if (taskType) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .where('uwh.task_type', taskType)
        })
      }

      if (problemCategory) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .where('uwh.problem_category', problemCategory)
        })
      }

      if (roleInTask) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .where('uwh.role_in_task', roleInTask)
        })
      }

      const normalizedTechStack = techStack?.trim().toLowerCase()
      if (normalizedTechStack) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .whereRaw('LOWER(uwh.tech_stack::text) LIKE ?', ['%' + normalizedTechStack + '%'])
        })
      }

      const normalizedDomainTags = domainTags?.trim().toLowerCase()
      if (normalizedDomainTags) {
        query = query.whereExists((builder) => {
          void builder
            .from('user_work_history as uwh')
            .whereColumn('uwh.user_id', 'users.id')
            .whereRaw('LOWER(uwh.domain_tags::text) LIKE ?', ['%' + normalizedDomainTags + '%'])
        })
      }

      if (saved) {
        if (recruiterUserId) {
          query = query.whereExists((builder) => {
            void builder
              .from('recruiter_bookmarks as rb')
              .whereColumn('rb.talent_user_id', 'users.id')
              .where('rb.recruiter_user_id', recruiterUserId)
          })
        } else {
          query = query.whereRaw('1 = 0')
        }
      }

      if (minTrustScore !== undefined) {
        query = query.whereRaw("COALESCE((trust_data->>'calculated_score')::numeric, 0) >= ?", [
          minTrustScore,
        ])
      }

      if (minCompletedTasks !== undefined) {
        query = query.where('external_contributor_completed_tasks_count', '>=', minCompletedTasks)
      }

      const totalResult = (await query.clone().count('* as count').first()) as
        | { count?: number | string }
        | undefined

      const rowsQuery = query.clone()

      const direction = sortOrder === 'asc' ? 'asc' : 'desc'
      switch (sortBy ?? 'relevance') {
        case 'trust_score':
          void rowsQuery.orderByRaw(
            "COALESCE((trust_data->>'calculated_score')::numeric, 0) " + direction
          )
          break
        case 'completed_tasks':
          void rowsQuery.orderBy('external_contributor_completed_tasks_count', direction)
          break
        case 'name':
          void rowsQuery.orderBy('username', direction)
          break
        case 'relevance':
          void rowsQuery
            .orderByRaw("COALESCE((trust_data->>'calculated_score')::numeric, 0) desc")
            .orderBy('external_contributor_completed_tasks_count', 'desc')
      }

      const rows = (await rowsQuery
        .orderBy('username', 'asc')
        .orderBy('id', 'asc')
        .offset(toOffset(page, perPage))
        .limit(perPage)
        .select(
          'id',
          'username',
          'status',
          'trust_data',
          'avatar_url',
          'bio',
          'profile_settings',
          'is_external_contributor',
          'external_contributor_completed_tasks_count'
        )) as {
        id: string
        username: string
        status: string
        trust_data: unknown
        avatar_url: string | null
        bio: string | null
        profile_settings: unknown
        is_external_contributor: boolean
        external_contributor_completed_tasks_count: number
      }[]

      return {
        items: rows,
        total: Number(totalResult?.count ?? 0),
      }
    },
    fetchBookmarks: async (recruiterUserId, talentUserIds) => {
      if (talentUserIds.length === 0) {
        return new Map()
      }

      const rows = (await db
        .from('recruiter_bookmarks')
        .where('recruiter_user_id', recruiterUserId)
        .whereIn('talent_user_id', talentUserIds)
        .select('id', 'talent_user_id', 'notes', 'folder', 'rating')) as {
        id: string
        talent_user_id: string
        notes: string | null
        folder: string | null
        rating: number | null
      }[]

      return new Map(rows.map((row) => [row.talent_user_id, row]))
    },
    countSavedBookmarks: async (recruiterUserId) => {
      const result = (await db
        .from('recruiter_bookmarks')
        .where('recruiter_user_id', recruiterUserId)
        .count('* as count')
        .first()) as { count?: number | string } | undefined

      return Number(result?.count ?? 0)
    },
    buildExplainabilitySummary: (talentUserIds) => buildTalentExplainabilitySummaryByUserId(talentUserIds),
  })
}
