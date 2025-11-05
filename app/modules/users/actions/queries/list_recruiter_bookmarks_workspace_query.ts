import db from '@adonisjs/lucid/services/db'

import { buildTalentExplainabilitySummaryByUserId } from '../support/talent_explainability_summary.js'

import {
  buildPaginationMeta,
  normalizePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import {
  type CanonicalPagePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/users/actions/base_query'
import { USER_PAGINATION } from '#modules/users/application/dtos/common/user_pagination'

export interface ListRecruiterBookmarksWorkspaceDTO {
  q?: string
  folder?: string
  page?: number
  per_page?: number
  perPage?: number
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
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
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
  pagination: CanonicalPagePagination
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
        pagination: toCanonicalPagePagination(buildPaginationMeta(0, { page: 1, perPage: 10 })),
      }
    }

    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.perPage ?? dto.per_page,
      },
      USER_PAGINATION,
      { perPage: 10 }
    )

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

    const totalRow = (await query.clone().clearSelect().clearOrder().count('* as total').first()) as
      | { total?: string | number }
      | undefined
    const total = Number(totalRow?.total ?? 0)
    const rows = (await query
      .offset(toOffset(pagination.page, pagination.perPage))
      .limit(pagination.perPage)) as BookmarkWorkspaceRow[]
    const explainabilityByUserId = await buildTalentExplainabilitySummaryByUserId(
      rows.map((row) => row.talent_id)
    )

    const bookmarks = rows.map((row) => ({
      ...(() => {
        const explainability = explainabilityByUserId.get(row.talent_id)
        return {
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
            reviewed_skills_count: explainability?.reviewedSkillsCount ?? 0,
            imported_skills_count: explainability?.importedSkillsCount ?? 0,
            under_dispute_skills_count: explainability?.underDisputeSkillsCount ?? 0,
            latest_confidence_signal: explainability?.latestConfidenceSignal ?? null,
          },
        }
      })(),
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
        total,
        folders,
      },
      pagination: toCanonicalPagePagination(buildPaginationMeta(total, pagination)),
    }
  }
}
