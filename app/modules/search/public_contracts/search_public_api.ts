import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  GlobalSearchQueryOptions,
  GlobalSearchResult,
} from '#modules/search/public_contracts/global_search_contract'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'

export type {
  GlobalSearchCenterResult,
  GlobalSearchEntityType,
  GlobalSearchFieldFacet,
  GlobalSearchQueryOptions,
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
  GlobalSearchTaskCommentResult,
  HighlightedSnippet,
  SearchMatchStrength,
  SearchResultTotalsByType,
} from '#modules/search/public_contracts/global_search_contract'

export interface SearchProjectionWriteContext {
  signal?: AbortSignal
  externalVersion?: number
  tombstoneAt?: string
}

export interface SearchDiscoveryPublicApi {
  discover<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options?: {
      readonly signal?: AbortSignal
      readonly searchSessionId?: string
    }
  ): Promise<SearchDiscoveryResponse<TDocument>>
}

export interface SearchPublicApi {
  isEnabled(): boolean
  ping(): Promise<boolean>
  search(
    rawQuery: string,
    execCtx: HttpActionContext,
    options?: GlobalSearchQueryOptions
  ): Promise<GlobalSearchResult>
  ensureTalentIndex(): Promise<void>
  resetTalentIndex(): Promise<void>
  talentIndexName(): string
  taskIndexName(): string
  projectIndexName(): string
  skillIndexName(): string
  organizationIndexName(): string
  userDirectoryIndexName(): string
  reindexTalentDocument(userId: string, signal?: AbortSignal): Promise<void>
  reindexTalentDocumentFenced(userId: string, context: SearchProjectionWriteContext): Promise<void>
  reindexTalentDocumentQuietly(userId: string): Promise<void>
  reindexAllTalents(): Promise<{ indexed: number; skipped: number }>
  reindexTaskDocument(taskId: string): Promise<void>
  reindexTaskDocumentQuietly(taskId: string): Promise<void>
  removeTaskDocumentQuietly(taskId: string): Promise<void>
  reindexAllTasks(): Promise<{ indexed: number; skipped: number }>
  reindexProjectDocument(projectId: string, context?: SearchProjectionWriteContext): Promise<void>
  reindexProjectDocumentQuietly(projectId: string): Promise<void>
  removeProjectDocument(projectId: string, context?: SearchProjectionWriteContext): Promise<void>
  removeProjectDocumentQuietly(projectId: string): Promise<void>
  reindexAllProjects(): Promise<{ indexed: number; skipped: number }>
  reindexSkillDocument(skillId: string): Promise<void>
  reindexSkillDocumentQuietly(skillId: string): Promise<void>
  reindexAllSkills(): Promise<{ indexed: number; skipped: number }>
  reindexOrganizationDocument(organizationId: string): Promise<void>
  reindexOrganizationDocumentQuietly(organizationId: string): Promise<void>
  removeOrganizationDocumentQuietly(organizationId: string): Promise<void>
  reindexAllOrganizations(): Promise<{ indexed: number; skipped: number }>
  reindexUserDirectoryDocument(userId: string): Promise<void>
  reindexUserDirectoryDocumentFenced(
    userId: string,
    context: SearchProjectionWriteContext
  ): Promise<void>
  reindexUserDirectoryDocumentQuietly(userId: string): Promise<void>
  removeUserDirectoryDocumentQuietly(userId: string): Promise<void>
  reindexAllUserDirectoryDocuments(): Promise<{ indexed: number; skipped: number }>
}

/**
 * Additive migration contract. WP-14 will compose this intersection after the
 * Discovery route and server-owned principal adapter exist; the legacy API is
 * intentionally unchanged until then.
 */
export type SearchPublicApiV2 = SearchPublicApi & SearchDiscoveryPublicApi
