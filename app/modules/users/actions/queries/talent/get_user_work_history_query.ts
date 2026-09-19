import { mergeAndProjectWorkCandidates } from './user_work_history_candidate_merger.js'
import {
  isEligibleVerifiedWork,
  mapOrganizationMemberships,
  mapProjectMemberships,
} from './user_work_history_mapper.js'
import type {
  DemonstratedWorkItem,
  GetUserWorkHistoryOptions,
  OrgMembershipItem,
  ProjectMembershipItem,
  WorkHistoryResult,
} from './user_work_history_types.js'

import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import {
  definePaginationPolicy,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { LegacyAccomplishmentCutoverDecision } from '#modules/users/actions/ports/inbound/legacy_accomplishment_cutover_decision'
import type { LegacyAccomplishmentReadComparisonObserver } from '#modules/users/actions/ports/outbound/legacy_accomplishment_read_comparison_observer'
import type { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'


export type {
  OrgMembershipItem,
  ProjectMembershipItem,
  WorkHistoryResult,
  DemonstratedWorkItem,
  GetUserWorkHistoryOptions,
}

export class GetUserWorkHistoryDTO {
  declare user_id: string
  declare work: GetUserWorkHistoryOptions

  constructor(userId: string, work: GetUserWorkHistoryOptions = {}) {
    this.user_id = userId
    this.work = work
  }
}

export default class GetUserWorkHistoryQuery extends BaseQuery<
  GetUserWorkHistoryDTO,
  WorkHistoryResult
> {
  constructor(
    execCtx: UserActionContext,
    private readonly dependencies: UserWorkHistoryReader,
    private readonly comparisonObserver?: LegacyAccomplishmentReadComparisonObserver,
    private readonly cutoverDecision: LegacyAccomplishmentCutoverDecision = {
      allowLegacyRead: true,
      allowNewRead: true,
      allowNewWrite: true,
    }
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserWorkHistoryDTO): Promise<WorkHistoryResult> {
    const viewerScope = this.execCtx.userId === dto.user_id ? 'self' : 'public'
    const hasWorkOptions = Object.keys(dto.work).length > 0
    const pagination = normalizePagination(dto.work, definePaginationPolicy(), { perPage: 10 })
    const logicalCacheKey = hasWorkOptions
      ? `users:work_history:${dto.user_id}:${viewerScope}:work:${pagination.page}:${pagination.perPage}:${dto.work.sort ?? 'completed_desc'}:${dto.work.verification ?? ''}:${dto.work.action ?? ''}:${dto.work.ownership ?? ''}`
      : `users:work_history:${dto.user_id}:${viewerScope}`

    const resolveHistory = async () => {
      const [
        orgRows,
        projectRows,
        demonstratedWorkRowsRaw,
        verifiedWorkRowsRaw,
        adminApprovedAiWorkRowsRaw,
      ] = await Promise.all([
        this.dependencies.listOrganizationMemberships(dto.user_id),
        this.dependencies.listProjectMemberships(dto.user_id, viewerScope),
        this.cutoverDecision.allowLegacyRead
          ? this.dependencies.listDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
        this.cutoverDecision.allowNewRead
          ? this.dependencies.listVerifiedDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
        this.cutoverDecision.allowNewRead
          ? this.dependencies.listAdminApprovedAiDemonstratedWork(dto.user_id, viewerScope)
          : Promise.resolve([]),
      ])

      const activePublicAccomplishmentIds =
        viewerScope === 'public'
          ? new Set(await this.dependencies.listActivePublicAccomplishmentIds(dto.user_id))
          : null

      const demonstratedWorkRows =
        viewerScope === 'public'
          ? demonstratedWorkRowsRaw.filter((row) => row.is_public !== false)
          : demonstratedWorkRowsRaw

      const verifiedWorkRows = verifiedWorkRowsRaw.filter(
        (row) =>
          isEligibleVerifiedWork(row, viewerScope) &&
          (viewerScope === 'self' ||
            activePublicAccomplishmentIds?.has(row.accomplishment_id) === true)
      )

      const adminApprovedAiWorkRows =
        viewerScope === 'public'
          ? adminApprovedAiWorkRowsRaw.filter((row) => row.is_public === true)
          : adminApprovedAiWorkRowsRaw

      const organizationIds = [
        ...new Set(projectRows.map((row) => row.organization_id).filter(Boolean)),
      ]
      const organizationNames =
        await this.dependencies.listOrganizationNamesByIds(organizationIds)
      const organizationNameById = new Map(
        organizationNames.map((organization) => [organization.id, organization.name])
      )

      const organizations = mapOrganizationMemberships(orgRows)
      const projects = mapProjectMemberships(projectRows, organizationNameById)

      const { demonstratedWork, paginationMeta } = mergeAndProjectWorkCandidates({
        userId: dto.user_id,
        viewerScope,
        demonstratedWorkRows,
        verifiedWorkRows,
        adminApprovedAiWorkRows,
        workOptions: dto.work,
        pagination,
        ...(this.comparisonObserver !== undefined
          ? { comparisonObserver: this.comparisonObserver }
          : {}),
        cutoverDecision: this.cutoverDecision,
      })

      return {
        organizations,
        projects,
        demonstratedWork,
        ...(paginationMeta ? { demonstratedWorkPagination: paginationMeta } : {}),
      }
    }

    const cacheKey = await this.resolveVersionedCacheKey(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
        'user',
        dto.user_id
      ),
      logicalCacheKey
    )
    if (!cacheKey) {
      return resolveHistory()
    }

    return this.executeWithCache(cacheKey, 300, resolveHistory)
  }

  protected resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    return cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  }
}
