import db from '@adonisjs/lucid/services/db'

import { BaseQuery } from '#modules/users/actions/base_query'

export interface ListRecruiterBookmarksWorkspaceDTO {
  q?: string
  folder?: string
}

export interface RecruiterBookmarkWorkspaceItem {
  id: string
  notes: string | null
  folder: string | null
  rating: number | null
  created_at: string | null
  talent: {
    id: string
    username: string
    status: string
    trust_score: number
  }
}

export interface RecruiterBookmarksWorkspaceResult {
  bookmarks: RecruiterBookmarkWorkspaceItem[]
  filters: {
    q: string | null
    folder: string | null
  }
  stats: {
    total: number
    folders: string[]
  }
}

interface BookmarkWorkspaceRow {
  id: string
  notes: string | null
  folder: string | null
  rating: number | null
  created_at: string | Date | null
  talent_id: string
  talent_username: string
  talent_status: string
  talent_trust_data: unknown
}

function toTrustScore(value: unknown): number {
  if (!value) return 0

  const parsed =
    typeof value === 'string'
      ? (JSON.parse(value) as { calculated_score?: unknown })
      : (value as { calculated_score?: unknown })

  return typeof parsed.calculated_score === 'number' ? parsed.calculated_score : 0
}

function toIsoString(value: string | Date | null): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

export default class ListRecruiterBookmarksWorkspaceQuery extends BaseQuery<
  ListRecruiterBookmarksWorkspaceDTO,
  RecruiterBookmarksWorkspaceResult
> {
  async execute(
    dto: ListRecruiterBookmarksWorkspaceDTO
  ): Promise<RecruiterBookmarksWorkspaceResult> {
    return this.handle(dto)
  }

  async handle(dto: ListRecruiterBookmarksWorkspaceDTO): Promise<RecruiterBookmarksWorkspaceResult> {
    const currentUserId = this.getCurrentUserId()

    if (!currentUserId) {
      return {
        bookmarks: [],
        filters: {
          q: dto.q?.trim() ? dto.q.trim() : null,
          folder: dto.folder?.trim() ? dto.folder.trim() : null,
        },
        stats: {
          total: 0,
          folders: [],
        },
      }
    }

    let query = db
      .from('recruiter_bookmarks as rb')
      .join('users as u', 'u.id', 'rb.talent_user_id')
      .where('rb.recruiter_user_id', currentUserId)
      .select(
        'rb.id',
        'rb.notes',
        'rb.folder',
        'rb.rating',
        'rb.created_at',
        'u.id as talent_id',
        'u.username as talent_username',
        'u.status as talent_status',
        'u.trust_data as talent_trust_data'
      )
      .orderBy('rb.created_at', 'desc')

    if (dto.q?.trim()) {
      const search = `%${dto.q.trim()}%`
      query = query.whereRaw('(u.username ilike ? or rb.notes ilike ? or rb.folder ilike ?)', [
        search,
        search,
        search,
      ])
    }

    if (dto.folder?.trim()) {
      query = query.whereRaw('rb.folder ilike ?', [dto.folder.trim()])
    }

    const rows = (await query) as BookmarkWorkspaceRow[]

    const bookmarks = rows.map((row) => ({
      id: row.id,
      notes: row.notes,
      folder: row.folder,
      rating: row.rating,
      created_at: toIsoString(row.created_at),
      talent: {
        id: row.talent_id,
        username: row.talent_username,
        status: row.talent_status,
        trust_score: toTrustScore(row.talent_trust_data),
      },
    }))

    const folders = Array.from(
      new Set(bookmarks.map((bookmark) => bookmark.folder).filter((folder): folder is string => Boolean(folder)))
    ).sort((left, right) => left.localeCompare(right))

    return {
      bookmarks,
      filters: {
        q: dto.q?.trim() ? dto.q.trim() : null,
        folder: dto.folder?.trim() ? dto.folder.trim() : null,
      },
      stats: {
        total: bookmarks.length,
        folders,
      },
    }
  }
}
