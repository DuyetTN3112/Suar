import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  GlobalSearchQueryOptions,
  GlobalSearchResult,
} from '#modules/search/public_contracts/global_search_contract'
import type {
  SearchDiscoveryRequest,
  SearchDiscoveryResponse,
} from '#modules/search/public_contracts/search_discovery_contract'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'
import type {
  SearchProjectionWriteContext,
  SearchPublicApiV2,
} from '#modules/search/public_contracts/search_public_api'

export interface SearchRuntimePort {
  isEnabled(): boolean
  ping(): Promise<boolean>
}

export interface SearchCollectionProjectionPort {
  indexName(): string
  reindexAll(): Promise<{ indexed: number; skipped: number }>
}

export interface SearchDocumentProjectionPort extends SearchCollectionProjectionPort {
  reindexDocument(id: string): Promise<void>
  reindexDocumentQuietly(id: string): Promise<void>
}

export interface SearchRemovableProjectionPort extends SearchDocumentProjectionPort {
  removeDocumentQuietly(id: string): Promise<void>
}

export interface SearchDirectRemovableProjectionPort extends SearchRemovableProjectionPort {
  reindexDocument(id: string, context?: SearchProjectionWriteContext): Promise<void>
  removeDocument(id: string, context?: SearchProjectionWriteContext): Promise<void>
}

export interface SearchTalentProjectionPort extends SearchDocumentProjectionPort {
  ensureIndex(): Promise<void>
  resetIndex(): Promise<void>
  reindexDocument(id: string, signal?: AbortSignal): Promise<void>
  reindexDocumentFenced(id: string, context: SearchProjectionWriteContext): Promise<void>
}

export interface SearchUserDirectoryProjectionPort extends SearchRemovableProjectionPort {
  reindexDocumentFenced(id: string, context: SearchProjectionWriteContext): Promise<void>
}

export interface GlobalSearchQueryPort {
  handle(rawQuery: string, options?: GlobalSearchQueryOptions): Promise<GlobalSearchResult>
}

export interface SearchDiscoveryQueryPort {
  execute(input: {
    readonly request: SearchDiscoveryRequest
    readonly principal: FilterPrincipal
    readonly requestId: string
    readonly searchSessionId?: string
    readonly signal?: AbortSignal
  }): Promise<SearchDiscoveryResponse<unknown>>
}

export interface SearchPublicApiAdapterDependencies {
  runtime: SearchRuntimePort
  talents: SearchTalentProjectionPort
  tasks: SearchRemovableProjectionPort
  projects: SearchDirectRemovableProjectionPort
  skills: SearchDocumentProjectionPort
  organizations: SearchRemovableProjectionPort
  userDirectory: SearchUserDirectoryProjectionPort
  makeGlobalSearchQuery: (execCtx: HttpActionContext) => GlobalSearchQueryPort
  makeSearchDiscoveryQuery?: (execCtx: HttpActionContext) => SearchDiscoveryQueryPort
  requestIdGenerator?: () => string
}

export class SearchPublicApiAdapter implements SearchPublicApiV2 {
  private readonly runtime: SearchRuntimePort
  private readonly talents: SearchTalentProjectionPort
  private readonly tasks: SearchRemovableProjectionPort
  private readonly projects: SearchDirectRemovableProjectionPort
  private readonly skills: SearchDocumentProjectionPort
  private readonly organizations: SearchRemovableProjectionPort
  private readonly userDirectory: SearchUserDirectoryProjectionPort
  private readonly makeGlobalSearchQuery: (execCtx: HttpActionContext) => GlobalSearchQueryPort
  private readonly makeSearchDiscoveryQuery: (
    execCtx: HttpActionContext
  ) => SearchDiscoveryQueryPort
  private readonly requestIdGenerator: () => string

  constructor(dependencies: SearchPublicApiAdapterDependencies) {
    this.runtime = dependencies.runtime
    this.talents = dependencies.talents
    this.tasks = dependencies.tasks
    this.projects = dependencies.projects
    this.skills = dependencies.skills
    this.organizations = dependencies.organizations
    this.userDirectory = dependencies.userDirectory
    this.makeGlobalSearchQuery = dependencies.makeGlobalSearchQuery
    this.makeSearchDiscoveryQuery =
      dependencies.makeSearchDiscoveryQuery ?? (() => unavailableSearchDiscoveryQuery)
    this.requestIdGenerator = dependencies.requestIdGenerator ?? generateRequestId
  }

  isEnabled(): boolean {
    return this.runtime.isEnabled()
  }

  async ping(): Promise<boolean> {
    if (!this.runtime.isEnabled()) {
      return false
    }

    return this.runtime.ping()
  }

  async search(
    rawQuery: string,
    execCtx: HttpActionContext,
    options: GlobalSearchQueryOptions = {}
  ): Promise<GlobalSearchResult> {
    return this.makeGlobalSearchQuery(execCtx).handle(rawQuery, options)
  }

  async discover<TDocument = Readonly<Record<string, unknown>>>(
    request: SearchDiscoveryRequest,
    execCtx: HttpActionContext,
    options: { readonly signal?: AbortSignal; readonly searchSessionId?: string } = {}
  ): Promise<SearchDiscoveryResponse<TDocument>> {
    if (!this.runtime.isEnabled()) {
      throw new SearchDiscoveryError('SEARCH_INDEX_DISABLED')
    }
    const requestId = execCtx.requestId ?? this.requestIdGenerator()
    return this.makeSearchDiscoveryQuery(execCtx).execute({
      request,
      principal: principalFromHttpContext(execCtx),
      requestId,
      ...(options.searchSessionId === undefined
        ? {}
        : { searchSessionId: options.searchSessionId }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    }) as Promise<SearchDiscoveryResponse<TDocument>>
  }

  async ensureTalentIndex(): Promise<void> {
    await this.talents.ensureIndex()
  }

  async resetTalentIndex(): Promise<void> {
    await this.talents.resetIndex()
  }

  talentIndexName(): string {
    return this.talents.indexName()
  }

  taskIndexName(): string {
    return this.tasks.indexName()
  }

  projectIndexName(): string {
    return this.projects.indexName()
  }

  skillIndexName(): string {
    return this.skills.indexName()
  }

  organizationIndexName(): string {
    return this.organizations.indexName()
  }

  userDirectoryIndexName(): string {
    return this.userDirectory.indexName()
  }

  async reindexTalentDocument(userId: string, signal?: AbortSignal): Promise<void> {
    await this.talents.reindexDocument(userId, signal)
  }

  async reindexTalentDocumentFenced(
    userId: string,
    context: SearchProjectionWriteContext
  ): Promise<void> {
    await this.talents.reindexDocumentFenced(userId, context)
  }

  async reindexTalentDocumentQuietly(userId: string): Promise<void> {
    await this.talents.reindexDocumentQuietly(userId)
  }

  async reindexAllTalents(): Promise<{ indexed: number; skipped: number }> {
    return this.talents.reindexAll()
  }

  async reindexTaskDocument(taskId: string): Promise<void> {
    await this.tasks.reindexDocument(taskId)
  }

  async reindexTaskDocumentQuietly(taskId: string): Promise<void> {
    await this.tasks.reindexDocumentQuietly(taskId)
  }

  async removeTaskDocumentQuietly(taskId: string): Promise<void> {
    await this.tasks.removeDocumentQuietly(taskId)
  }

  async reindexAllTasks(): Promise<{ indexed: number; skipped: number }> {
    return this.tasks.reindexAll()
  }

  async reindexProjectDocument(
    projectId: string,
    context?: SearchProjectionWriteContext
  ): Promise<void> {
    await this.projects.reindexDocument(projectId, context)
  }

  async reindexProjectDocumentQuietly(projectId: string): Promise<void> {
    await this.projects.reindexDocumentQuietly(projectId)
  }

  async removeProjectDocument(
    projectId: string,
    context?: SearchProjectionWriteContext
  ): Promise<void> {
    await this.projects.removeDocument(projectId, context)
  }

  async removeProjectDocumentQuietly(projectId: string): Promise<void> {
    await this.projects.removeDocumentQuietly(projectId)
  }

  async reindexAllProjects(): Promise<{ indexed: number; skipped: number }> {
    return this.projects.reindexAll()
  }

  async reindexSkillDocument(skillId: string): Promise<void> {
    await this.skills.reindexDocument(skillId)
  }

  async reindexSkillDocumentQuietly(skillId: string): Promise<void> {
    await this.skills.reindexDocumentQuietly(skillId)
  }

  async reindexAllSkills(): Promise<{ indexed: number; skipped: number }> {
    return this.skills.reindexAll()
  }

  async reindexOrganizationDocument(organizationId: string): Promise<void> {
    await this.organizations.reindexDocument(organizationId)
  }

  async reindexOrganizationDocumentQuietly(organizationId: string): Promise<void> {
    await this.organizations.reindexDocumentQuietly(organizationId)
  }

  async removeOrganizationDocumentQuietly(organizationId: string): Promise<void> {
    await this.organizations.removeDocumentQuietly(organizationId)
  }

  async reindexAllOrganizations(): Promise<{ indexed: number; skipped: number }> {
    return this.organizations.reindexAll()
  }

  async reindexUserDirectoryDocument(userId: string): Promise<void> {
    await this.userDirectory.reindexDocument(userId)
  }

  async reindexUserDirectoryDocumentFenced(
    userId: string,
    context: SearchProjectionWriteContext
  ): Promise<void> {
    await this.userDirectory.reindexDocumentFenced(userId, context)
  }

  async reindexUserDirectoryDocumentQuietly(userId: string): Promise<void> {
    await this.userDirectory.reindexDocumentQuietly(userId)
  }

  async removeUserDirectoryDocumentQuietly(userId: string): Promise<void> {
    await this.userDirectory.removeDocumentQuietly(userId)
  }

  async reindexAllUserDirectoryDocuments(): Promise<{ indexed: number; skipped: number }> {
    return this.userDirectory.reindexAll()
  }
}

function principalFromHttpContext(execCtx: HttpActionContext): FilterPrincipal {
  if (execCtx.userId === null) return { kind: 'anonymous' }
  const organizationRole = isOrganizationRole(execCtx.actorRoleSurface)
    ? execCtx.actorRoleSurface
    : undefined
  return {
    kind: 'user',
    id: execCtx.userId,
    ...(typeof execCtx.organizationId === 'string'
      ? { organizationId: execCtx.organizationId }
      : {}),
    ...(organizationRole === undefined ? {} : { organizationRole }),
  }
}

function isOrganizationRole(
  value: string | null | undefined
): value is 'org_owner' | 'org_member' | 'org_admin' {
  return value === 'org_owner' || value === 'org_member' || value === 'org_admin'
}

function generateRequestId(): string {
  return `search-discovery-${crypto.randomUUID()}`
}

const unavailableSearchDiscoveryQuery: SearchDiscoveryQueryPort = {
  execute: () => Promise.reject(new SearchDiscoveryError('SEARCH_SOURCE_UNAVAILABLE')),
}
