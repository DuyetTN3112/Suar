import type SearchTalentsQuery from '../search/search_talents_query.js'
import type { SearchTalentsDTO, TalentSearchResult } from '../search/search_talents_query.js'

import {
  buildPaginationMeta,
  normalizePagination,
  slicePageItems,
} from '#modules/pagination/public_contracts/pagination_public_api'
import {
  type CanonicalPagePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/users/actions/base_query'
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import type {
  TalentDirectoryBookmarkRow,
  TalentDirectoryPageReader,
  TalentDirectoryUserRow,
} from '#modules/users/actions/ports/outbound/talent_directory_page_reader'
import type { TalentSkillCategoryReader } from '#modules/users/actions/ports/outbound/talent_skill_category_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { TalentPublicAccomplishmentReader } from '#modules/users/actions/ports/outbound/talent_public_accomplishment_reader'
import type { TalentPublicAccomplishmentSummary } from '#modules/users/public_contracts/talent_search'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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
    skill_categories: string[] | null
    skill_ids: string[] | null
    business_domain: string | null
    task_type: string | null
    problem_category: string | null
    role_in_task: string | null
    tech_stack: string | null
    domain_tags: string | null
    sort_by: 'relevance' | 'trust_score' | 'completed_tasks' | 'name'
    sort_order: 'asc' | 'desc'
    saved: boolean | null
    min_trust_score: number | null
    min_completed_tasks: number | null
  }
  stats: {
    total: number
    saved: number
  }
  page: number
  per_page: number
  total_pages: number
  pagination: CanonicalPagePagination
}

interface GetTalentDirectoryPageQueryDeps {
  searchTalents: Pick<SearchTalentsQuery, 'handle'>
  pageReader: TalentDirectoryPageReader
  skillCategoryReader: TalentSkillCategoryReader
  buildExplainabilitySummary: (talentUserIds: string[]) => Promise<
    Map<
      string,
      {
        reviewedSkillsCount: number
        importedSkillsCount: number
        underDisputeSkillsCount: number
        latestConfidenceSignal: 'low' | 'medium' | 'high' | null
      }
    >
  >
  publicAccomplishments?: TalentPublicAccomplishmentReader
}

export default class GetTalentDirectoryPageQuery extends BaseQuery<
  SearchTalentsDTO,
  TalentDirectoryPageResult
> {
  constructor(
    execCtx: UserActionContext,
    private readonly deps: GetTalentDirectoryPageQueryDeps
  ) {
    super(execCtx)
  }

  async execute(dto: SearchTalentsDTO): Promise<TalentDirectoryPageResult> {
    return this.handle(dto)
  }

  async handle(dto: SearchTalentsDTO): Promise<TalentDirectoryPageResult> {
    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.per_page,
      },
      USER_PAGINATION
    )

    const currentUserId = this.getCurrentUserId()
    const result = dto.task_id
      ? await this.buildRankedTaskPage(dto, pagination, currentUserId)
      : await this.buildDefaultPage(dto, pagination, currentUserId)
    const meta = buildPaginationMeta(result.total, pagination)

    return {
      talents: result.items,
      filters: {
        q: dto.q?.trim() ? dto.q.trim() : null,
        task_id: dto.task_id?.trim() ? dto.task_id.trim() : null,
        skill_categories:
          dto.skill_categories && dto.skill_categories.length > 0 ? dto.skill_categories : null,
        skill_ids: dto.skill_ids && dto.skill_ids.length > 0 ? dto.skill_ids : null,
        business_domain: dto.business_domain?.trim() ? dto.business_domain.trim() : null,
        task_type: dto.task_type?.trim() ? dto.task_type.trim() : null,
        problem_category: dto.problem_category?.trim() ? dto.problem_category.trim() : null,
        role_in_task: dto.role_in_task?.trim() ? dto.role_in_task.trim() : null,
        tech_stack: dto.tech_stack?.trim() ? dto.tech_stack.trim() : null,
        domain_tags: dto.domain_tags?.trim() ? dto.domain_tags.trim() : null,
        sort_by: dto.sort_by ?? 'relevance',
        sort_order: dto.sort_order ?? 'desc',
        saved: dto.saved ?? null,
        min_trust_score: dto.min_trust_score ?? null,
        min_completed_tasks: dto.min_completed_tasks ?? null,
      },
      stats: {
        total: result.total,
        saved: result.savedCount,
      },
      page: meta.currentPage,
      per_page: meta.perPage,
      total_pages: meta.lastPage,
      pagination: toCanonicalPagePagination(meta),
    }
  }

  private async buildDefaultPage(
    dto: SearchTalentsDTO,
    pagination: { page: number; perPage: number },
    currentUserId: string | null
  ): Promise<{ items: TalentDirectoryItem[]; total: number; savedCount: number }> {
    const categorySkillIds =
      dto.skill_categories && dto.skill_categories.length > 0
        ? await this.deps.skillCategoryReader.resolveActiveSkillIdsByCategoryCodes(
            dto.skill_categories
          )
        : null
    const page = await this.deps.pageReader.fetchTalentPage(
      omitUndefined({
        q: dto.q?.trim() || undefined,
        categorySkillIds,
        skillIds: dto.skill_ids ?? null,
        businessDomain: dto.business_domain?.trim() || null,
        taskType: dto.task_type?.trim() || null,
        problemCategory: dto.problem_category?.trim() || null,
        roleInTask: dto.role_in_task?.trim() || null,
        techStack: dto.tech_stack?.trim() || null,
        domainTags: dto.domain_tags?.trim() || null,
        sortBy: dto.sort_by ?? 'relevance',
        sortOrder: dto.sort_order ?? 'desc',
        saved: dto.saved,
        minTrustScore: dto.min_trust_score,
        minCompletedTasks: dto.min_completed_tasks,
        recruiterUserId: currentUserId,
        page: pagination.page,
        perPage: pagination.perPage,
      })
    )

    return this.buildPageItems(page.items, page.total, currentUserId)
  }

  private async buildRankedTaskPage(
    dto: SearchTalentsDTO,
    pagination: { page: number; perPage: number },
    currentUserId: string | null
  ): Promise<{ items: TalentDirectoryItem[]; total: number; savedCount: number }> {
    const allTalents = await this.deps.searchTalents.handle(
      omitUndefined({
        ...dto,
        page: undefined,
        per_page: undefined,
      })
    )
    const filteredTalents = await this.filterPrecomputedTalents(allTalents, dto, currentUserId)
    this.sortPrecomputedTalents(filteredTalents, dto)

    const paginatedTalents = slicePageItems(filteredTalents, pagination)
    const rows = paginatedTalents.map((talent) => ({
      id: talent.id,
      username: talent.username,
      status: talent.status,
      trust_data: {
        calculated_score: talent.trust_score ?? 0,
      },
      avatar_url: talent.avatar_url ?? null,
      bio: talent.bio ?? null,
      profile_settings: {
        custom_headline: talent.custom_headline ?? null,
      },
      is_external_contributor: true,
      external_contributor_completed_tasks_count: talent.completed_tasks ?? 0,
    }))

    return this.buildPageItems(rows, filteredTalents.length, currentUserId, paginatedTalents)
  }

  private async filterPrecomputedTalents(
    talents: TalentSearchResult[],
    dto: SearchTalentsDTO,
    currentUserId: string | null
  ): Promise<TalentSearchResult[]> {
    let filtered = talents.filter((talent) => {
      if (dto.min_trust_score !== undefined && (talent.trust_score ?? 0) < dto.min_trust_score) {
        return false
      }

      if (
        dto.min_completed_tasks !== undefined &&
        (talent.completed_tasks ?? 0) < dto.min_completed_tasks
      ) {
        return false
      }

      return true
    })

    if (dto.saved && currentUserId && filtered.length > 0) {
      const bookmarks = await this.deps.pageReader.fetchBookmarks(
        currentUserId,
        filtered.map((talent) => talent.id)
      )
      filtered = filtered.filter((talent) => bookmarks.has(talent.id))
    } else if (dto.saved) {
      filtered = []
    }

    return filtered
  }

  private sortPrecomputedTalents(talents: TalentSearchResult[], dto: SearchTalentsDTO): void {
    const sortBy = dto.sort_by ?? 'relevance'
    const direction = dto.sort_order === 'asc' ? 1 : -1

    talents.sort((left, right) => {
      let delta = 0
      switch (sortBy) {
        case 'trust_score':
          delta = (left.trust_score ?? 0) - (right.trust_score ?? 0)
          break
        case 'completed_tasks':
          delta = (left.completed_tasks ?? 0) - (right.completed_tasks ?? 0)
          break
        case 'name':
          delta = left.username.localeCompare(right.username)
          break
        case 'relevance':
          delta = (left.match_score ?? 0) - (right.match_score ?? 0)
      }

      if (delta !== 0) return delta * direction
      return left.username.localeCompare(right.username)
    })
  }

  private async buildPageItems(
    rows: TalentDirectoryUserRow[],
    total: number,
    currentUserId: string | null,
    precomputedResults?: TalentSearchResult[]
  ): Promise<{ items: TalentDirectoryItem[]; total: number; savedCount: number }> {
    const bookmarksByTalentId =
      currentUserId && rows.length > 0
        ? await this.deps.pageReader.fetchBookmarks(
            currentUserId,
            rows.map((row) => row.id)
          )
        : new Map<string, TalentDirectoryBookmarkRow>()
    const explainabilityByUserId = await this.deps.buildExplainabilitySummary(
      rows.map((row) => row.id)
    )
    const publicAccomplishmentsByUserId = new Map<
      string,
      readonly TalentPublicAccomplishmentSummary[]
    >()
    if (this.deps.publicAccomplishments) {
      const accomplishmentResults = await Promise.all(
        rows.map(async (row) => [row.id, await this.deps.publicAccomplishments!.listForUser(row.id)] as const)
      )
      for (const [userId, accomplishments] of accomplishmentResults) {
        publicAccomplishmentsByUserId.set(
          userId,
          accomplishments.slice(0, 3).map((accomplishment) => ({
            title: accomplishment.title,
            concise_statement: accomplishment.conciseStatement,
            action: accomplishment.action,
            object: accomplishment.object,
            role: accomplishment.role,
            ownership_level: accomplishment.ownershipLevel,
            verification_status: accomplishment.verificationStatus,
            confidence_band: accomplishment.confidenceBand,
            published_at: accomplishment.publishedAt,
          }))
        )
      }
    }
    const savedCount = currentUserId
      ? await this.deps.pageReader.countSavedBookmarks(currentUserId)
      : 0

    const precomputedMap = new Map((precomputedResults ?? []).map((talent) => [talent.id, talent]))
    const items = rows.map((row) => {
      const bookmark = bookmarksByTalentId.get(row.id)
      const explainability = explainabilityByUserId.get(row.id)
      const ranked = precomputedMap.get(row.id)
      const trustData = (
        typeof row.trust_data === 'string' ? JSON.parse(row.trust_data) : (row.trust_data ?? {})
      ) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const profileSettings = (
        typeof row.profile_settings === 'string'
          ? JSON.parse(row.profile_settings)
          : (row.profile_settings ?? {})
      ) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>

      return omitUndefined({
        id: row.id,
        username: row.username,
        status: row.status,
        match_score: ranked?.match_score,
        skill_match: ranked?.skill_match ?? trustData.performance_breakdown?.quality_score ?? 0,
        domain_match:
          ranked?.domain_match ?? trustData.performance_breakdown?.consistency_score ?? 0,
        delivery_reliability:
          ranked?.delivery_reliability ??
          trustData.performance_score ??
          trustData.performance_breakdown?.delivery_score ??
          0,
        trust_score: ranked?.trust_score ?? trustData.calculated_score ?? 0,
        explanations: ranked?.explanations,
        risks: ranked?.risks,
        avatar_url: row.avatar_url,
        bio: row.bio,
        custom_headline: ranked?.custom_headline ?? profileSettings.custom_headline ?? null,
        completed_tasks: ranked?.completed_tasks ?? row.external_contributor_completed_tasks_count,
        reviewed_skills_count:
          ranked?.reviewed_skills_count ?? explainability?.reviewedSkillsCount ?? 0,
        imported_skills_count:
          ranked?.imported_skills_count ?? explainability?.importedSkillsCount ?? 0,
        under_dispute_skills_count:
          ranked?.under_dispute_skills_count ?? explainability?.underDisputeSkillsCount ?? 0,
        latest_confidence_signal:
          ranked?.latest_confidence_signal ?? explainability?.latestConfidenceSignal ?? null,
        ...(publicAccomplishmentsByUserId.has(row.id)
          ? { public_accomplishments: publicAccomplishmentsByUserId.get(row.id) }
          : {}),
        bookmark: {
          id: bookmark?.id ?? null,
          isSaved: Boolean(bookmark),
          notes: bookmark?.notes ?? null,
          folder: bookmark?.folder ?? null,
          rating: bookmark?.rating ?? null,
        },
      })
    })

    return { items, total, savedCount }
  }
}
