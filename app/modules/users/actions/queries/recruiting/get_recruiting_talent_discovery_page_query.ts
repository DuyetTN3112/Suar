import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { SearchDiscoveryResponse } from '#modules/search/public_contracts/search_discovery_contract'
import type { TalentSearchDiscoveryDocument } from '#modules/search/public_contracts/talent_search_discovery_document'
import type { TalentDiscoveryReader } from '#modules/users/actions/ports/outbound/talent_discovery_reader'
import type {
  TalentPublicAccomplishmentReader,
  TalentPublicAccomplishmentRecord,
} from '#modules/users/actions/ports/outbound/talent_public_accomplishment_reader'
import type { SearchTalentsDTO } from '#modules/users/actions/queries/search/search_talents_query'
import type { TalentDirectoryOptionsResult } from '#modules/users/actions/queries/talent/get_talent_directory_options_query'
import type { TalentPublicAccomplishmentSummary } from '#modules/users/public_contracts/talent_search'

interface TalentDirectoryOptionsProvider {
  execute(organizationId: string): Promise<TalentDirectoryOptionsResult>
}

export interface RecruitingTalentDiscoveryPageResult {
  talents: Array<{
    id: string
    username: string
    status: 'active'
    trust_score: number
    completed_tasks: number
    custom_headline: string | null
    bio: string | null
    bookmark: {
      id: null
      isSaved: false
      notes: null
      folder: null
      rating: null
    }
    public_accomplishments?: readonly TalentPublicAccomplishmentSummary[]
  }>
  filters: SearchTalentsDTO
  stats: { total: number; saved: number }
  page: number
  per_page: number
  total_pages: number
  total: number
  pagination: {
    mode: 'cursor'
    page: number
    perPage: number
    total: number
    lastPage: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    cursor: { nextCursor: string | null; previousCursor: string | null }
  }
  facets: SearchDiscoveryResponse<TalentSearchDiscoveryDocument>['facets']
  search: SearchDiscoveryResponse<TalentSearchDiscoveryDocument>['search']
  authority: SearchDiscoveryResponse<TalentSearchDiscoveryDocument>['authority']
  availableSkills: TalentDirectoryOptionsResult['availableSkills']
  availableTasks: TalentDirectoryOptionsResult['availableTasks']
}

export default class GetRecruitingTalentDiscoveryPageQuery {
  constructor(
    private readonly reader: TalentDiscoveryReader,
    private readonly execCtx: HttpActionContext,
    private readonly publicAccomplishments?: TalentPublicAccomplishmentReader,
    private readonly directoryOptions?: TalentDirectoryOptionsProvider
  ) {}

  async handle(input: SearchTalentsDTO, cursor?: string): Promise<RecruitingTalentDiscoveryPageResult> {
    const perPage = input.per_page ?? 20
    const response = await this.reader.read({
      input: toCanonicalInput(input),
      execCtx: this.execCtx,
      ...(cursor === undefined ? {} : { cursor }),
    })
    const publicAccomplishments = this.publicAccomplishments
      ? new Map(
          await Promise.all(
            response.hits.filter(({ entityId }) => isUuid(entityId)).map(async ({ entityId }) => [
              entityId,
              toPublicAccomplishmentSummaries(
                (await this.publicAccomplishments?.listForUser(entityId)) ?? []
              ),
            ] as const)
          )
        )
      : undefined
    const options =
      this.directoryOptions && this.execCtx.organizationId
        ? await this.directoryOptions.execute(this.execCtx.organizationId)
        : { availableSkills: [], availableTasks: [] }
    return mapResponse(response, input, perPage, publicAccomplishments, options)
  }

  async executeAndWrap(
    input: SearchTalentsDTO,
    cursor?: string
  ): Promise<Result<RecruitingTalentDiscoveryPageResult, AppException>> {
    try {
      return Result.ok(await this.handle(input, cursor))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function toPublicAccomplishmentSummaries(
  records: readonly TalentPublicAccomplishmentRecord[]
): readonly TalentPublicAccomplishmentSummary[] {
  return records.slice(0, 3).map((record) => ({
    title: record.title,
    concise_statement: record.conciseStatement,
    action: record.action,
    object: record.object,
    role: record.role,
    ownership_level: record.ownershipLevel,
    verification_status: record.verificationStatus,
    confidence_band: record.confidenceBand,
    published_at: record.publishedAt,
  }))
}

function toCanonicalInput(input: SearchTalentsDTO): SearchTalentsDTO {
  return {
    ...(input.q === undefined ? {} : { q: input.q }),
    ...(input.skill_ids === undefined ? {} : { skill_ids: input.skill_ids }),
    ...(input.business_domain === undefined ? {} : { business_domain: input.business_domain }),
    ...(input.task_type === undefined ? {} : { task_type: input.task_type }),
    ...(input.problem_category === undefined ? {} : { problem_category: input.problem_category }),
    ...(input.tech_stack === undefined ? {} : { tech_stack: input.tech_stack }),
    ...(input.min_trust_score === undefined ? {} : { min_trust_score: input.min_trust_score }),
    ...(input.min_completed_tasks === undefined
      ? {}
      : { min_completed_tasks: input.min_completed_tasks }),
    ...(input.available_before === undefined
      ? {}
      : { available_before: input.available_before }),
    ...(input.min_proficiency === undefined ? {} : { min_proficiency: input.min_proficiency }),
    ...(input.sort_by === 'trust_score' || input.sort_by === 'completed_tasks'
      ? { sort_by: input.sort_by, sort_order: input.sort_order ?? 'desc' }
      : {}),
    page: input.page ?? 1,
    per_page: input.per_page ?? 20,
  }
}

function mapResponse(
  response: SearchDiscoveryResponse<TalentSearchDiscoveryDocument>,
  input: SearchTalentsDTO,
  perPage: number,
  publicAccomplishments?: Map<string, readonly TalentPublicAccomplishmentSummary[] | undefined>,
  options: TalentDirectoryOptionsResult = { availableSkills: [], availableTasks: [] }
): RecruitingTalentDiscoveryPageResult {
  const total = response.total.value
  const nextCursor = response.page.nextCursor ?? null
  const previousCursor = response.page.previousCursor ?? null
  return {
    talents: response.hits.map(({ entityId, document }) => {
      const accomplishments = publicAccomplishments?.get(entityId)
      return {
        id: entityId,
        username: document.username,
        status: 'active' as const,
        trust_score: document.trustScore,
        completed_tasks: document.completedTasks,
        custom_headline: document.headline,
        bio: document.bio,
        ...(accomplishments && accomplishments.length > 0
          ? { public_accomplishments: accomplishments }
          : {}),
        bookmark: { id: null, isSaved: false as const, notes: null, folder: null, rating: null },
      }
    }),
    filters: toCanonicalInput(input),
    stats: { total, saved: 0 },
    total,
    page: 1,
    per_page: perPage,
    total_pages: 1,
    pagination: {
      mode: 'cursor',
      page: 1,
      perPage,
      total,
      lastPage: 1,
      hasNextPage: nextCursor !== null,
      hasPreviousPage: previousCursor !== null,
      cursor: { nextCursor, previousCursor },
    },
    facets: response.facets,
    search: response.search,
    authority: response.authority,
    availableSkills: options.availableSkills,
    availableTasks: options.availableTasks,
  }
}
