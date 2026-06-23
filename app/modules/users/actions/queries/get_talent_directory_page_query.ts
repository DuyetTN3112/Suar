import db from '@adonisjs/lucid/services/db'

import SearchTalentsQuery, { type SearchTalentsDTO, type TalentSearchResult } from './search_talents_query.js'

import { BaseQuery } from '#modules/users/actions/base_query'

interface TalentBookmarkState {
  id: string | null
  isSaved: boolean
  notes: string | null
  folder: string | null
  rating: number | null
}

export interface TalentDirectoryItem extends TalentSearchResult {
  bookmark: TalentBookmarkState
}

export interface TalentDirectoryPageResult {
  talents: TalentDirectoryItem[]
  filters: {
    q: string | null
    task_id: string | null
  }
  stats: {
    total: number
    saved: number
  }
  page: number
  per_page: number
  total_pages: number
}

interface BookmarkRow {
  id: string
  talent_user_id: string
  notes: string | null
  folder: string | null
  rating: number | null
}

export default class GetTalentDirectoryPageQuery extends BaseQuery<
  SearchTalentsDTO,
  TalentDirectoryPageResult
> {
  async execute(dto: SearchTalentsDTO): Promise<TalentDirectoryPageResult> {
    return this.handle(dto)
  }

  async handle(dto: SearchTalentsDTO): Promise<TalentDirectoryPageResult> {
    const page = dto.page ?? 1
    const perPage = dto.per_page ?? 20

    // Get all matching talents for bookmark lookup
    const allTalents = await new SearchTalentsQuery(this.execCtx).handle({ ...dto, page: undefined, per_page: undefined })
    const currentUserId = this.getCurrentUserId()

    const bookmarksByTalentId = new Map<string, BookmarkRow>()

    if (currentUserId && allTalents.length > 0) {
      const rows = (await db
        .from('recruiter_bookmarks')
        .where('recruiter_user_id', currentUserId)
        .whereIn(
          'talent_user_id',
          allTalents.map((talent) => talent.id)
        )
        .select('id', 'talent_user_id', 'notes', 'folder', 'rating')) as BookmarkRow[]

      for (const row of rows) {
        bookmarksByTalentId.set(row.talent_user_id, row)
      }
    }

    // Apply pagination after bookmark enrichment
    const offset = (page - 1) * perPage
    const paginatedTalents = allTalents.slice(offset, offset + perPage)

    const items = paginatedTalents.map((talent) => {
      const bookmark = bookmarksByTalentId.get(talent.id)

      return {
        ...talent,
        bookmark: {
          id: bookmark?.id ?? null,
          isSaved: Boolean(bookmark),
          notes: bookmark?.notes ?? null,
          folder: bookmark?.folder ?? null,
          rating: bookmark?.rating ?? null,
        },
      }
    })

    const totalPages = Math.ceil(allTalents.length / perPage)

    return {
      talents: items,
      filters: {
        q: dto.q?.trim() ? dto.q.trim() : null,
        task_id: dto.task_id?.trim() ? dto.task_id.trim() : null,
      },
      stats: {
        total: allTalents.length,
        saved: items.filter((item) => item.bookmark.isSaved).length,
      },
      page,
      per_page: perPage,
      total_pages: totalPages,
    }
  }
}
