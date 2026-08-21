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
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import type { RecruiterBookmarkRepository } from '#modules/users/actions/ports/outbound/recruiter_bookmark_repository'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import { assertRecruitingDirectoryAccess } from '#modules/users/actions/policies/recruiting_directory_access_policy'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

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
  constructor(
    context: UserActionContext,
    private readonly bookmarks: RecruiterBookmarkRepository,
    private readonly talents: UserTalentRepository,
    private readonly access: UserRecruitingAccessReader
  ) {
    super(context)
  }

  async execute(
    dto: ListRecruiterBookmarksWorkspaceDTO
  ): Promise<RecruiterBookmarksWorkspaceResult> {
    return this.handle(dto)
  }

  async handle(
    dto: ListRecruiterBookmarksWorkspaceDTO
  ): Promise<RecruiterBookmarksWorkspaceResult> {
    const { userId: currentUserId } = await assertRecruitingDirectoryAccess(
      this.execCtx,
      this.access
    )

    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.perPage ?? dto.per_page,
      },
      USER_PAGINATION,
      { perPage: 10 }
    )

    const { rows, total } = await this.bookmarks.listWorkspace({
      recruiterUserId: currentUserId,
      search: dto.q?.trim() || null,
      folder: dto.folder?.trim() || null,
      offset: toOffset(pagination.page, pagination.perPage),
      limit: pagination.perPage,
    })
    const explainabilityByUserId = await this.talents.getExplainabilitySummaries(
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
      new Set(
        bookmarks
          .map((bookmark) => bookmark.folder)
          .filter((folder): folder is string => Boolean(folder))
      )
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
