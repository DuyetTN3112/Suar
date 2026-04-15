import db from '@adonisjs/lucid/services/db'

import { toOffset } from '#modules/pagination/public_contracts/pagination_public_api'
import type {
  TalentDirectoryBookmarkRow,
  TalentDirectoryPageReader,
  TalentDirectoryPageReadOptions,
  TalentDirectoryUserRow,
} from '#modules/users/actions/ports/outbound/talent_directory_page_reader'

export class PostgresTalentDirectoryPageReader implements TalentDirectoryPageReader {
  async fetchTalentPage({
    q,
    categorySkillIds,
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
  }: TalentDirectoryPageReadOptions): Promise<{
    items: TalentDirectoryUserRow[]
    total: number
  }> {
    let query = db
      .from('users')
      .where('status', 'active')
      .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

    if (q?.trim()) {
      const keyword = `%${q.trim()}%`
      query = query.where((builder) => {
        void builder
          .where('username', 'ilike', keyword)
          .orWhere('bio', 'ilike', keyword)
          .orWhereRaw("profile_settings->>'custom_headline' ilike ?", [keyword])
      })
    }

    if (categorySkillIds !== null && categorySkillIds !== undefined) {
      if (categorySkillIds.length === 0) {
        query = query.whereRaw('1 = 0')
      } else {
        query = query.whereExists((builder) => {
          void builder
            .from('user_skills as us')
            .whereColumn('us.user_id', 'users.id')
            .whereIn('us.skill_id', categorySkillIds)
        })
      }
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
          .where('uwh.is_public', true)
          .where('uwh.business_domain', businessDomain)
      })
    }

    if (taskType) {
      query = query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .where('uwh.task_type', taskType)
      })
    }

    if (problemCategory) {
      query = query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .where('uwh.problem_category', problemCategory)
      })
    }

    if (roleInTask) {
      query = query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .where('uwh.role_in_task', roleInTask)
      })
    }

    const normalizedTechStack = techStack?.trim().toLowerCase()
    if (normalizedTechStack) {
      query = query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .whereRaw('LOWER(uwh.tech_stack::text) LIKE ?', [`%${normalizedTechStack}%`])
      })
    }

    const normalizedDomainTags = domainTags?.trim().toLowerCase()
    if (normalizedDomainTags) {
      query = query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .whereRaw('LOWER(uwh.domain_tags::text) LIKE ?', [`%${normalizedDomainTags}%`])
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
      query = query.whereRaw(
        "COALESCE((trust_data->>'calculated_score')::numeric, 0) >= ?",
        [minTrustScore]
      )
    }

    if (minCompletedTasks !== undefined) {
      query = query.where(
        'external_contributor_completed_tasks_count',
        '>=',
        minCompletedTasks
      )
    }

    const totalResult = (await query.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined
    const rowsQuery = query.clone()
    const direction = sortOrder === 'asc' ? 'asc' : 'desc'

    switch (sortBy ?? 'relevance') {
      case 'trust_score':
        void rowsQuery.orderByRaw(
          `COALESCE((trust_data->>'calculated_score')::numeric, 0) ${direction}`
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

    const items = (await rowsQuery
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
      )) as TalentDirectoryUserRow[]

    return {
      items,
      total: Number(totalResult?.count ?? 0),
    }
  }

  async fetchBookmarks(
    recruiterUserId: string,
    talentUserIds: string[]
  ): Promise<Map<string, TalentDirectoryBookmarkRow>> {
    if (talentUserIds.length === 0) {
      return new Map()
    }

    const rows = (await db
      .from('recruiter_bookmarks')
      .where('recruiter_user_id', recruiterUserId)
      .whereIn('talent_user_id', talentUserIds)
      .select(
        'id',
        'talent_user_id',
        'notes',
        'folder',
        'rating'
      )) as TalentDirectoryBookmarkRow[]

    return new Map(rows.map((row) => [row.talent_user_id, row]))
  }

  async countSavedBookmarks(recruiterUserId: string): Promise<number> {
    const result = (await db
      .from('recruiter_bookmarks')
      .where('recruiter_user_id', recruiterUserId)
      .count('* as count')
      .first()) as { count?: number | string } | undefined

    return Number(result?.count ?? 0)
  }
}
