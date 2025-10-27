import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import {
  GlobalSearchQuery,
  type GlobalSearchQueryOptions,
  type GlobalSearchResult,
} from '#modules/search/actions/queries/global_search_query'
import { OrganizationSearchProjectionService } from '#modules/search/actions/services/organization_search_projection_service'
import { ProjectSearchProjectionService } from '#modules/search/actions/services/project_search_projection_service'
import { SearchRuntimeService } from '#modules/search/actions/services/search_runtime_service'
import { SkillSearchProjectionService } from '#modules/search/actions/services/skill_search_projection_service'
import { TalentSearchProjectionService } from '#modules/search/actions/services/talent_search_projection_service'
import { TaskSearchProjectionService } from '#modules/search/actions/services/task_search_projection_service'
import { UserDirectorySearchProjectionService } from '#modules/search/actions/services/user_directory_search_projection_service'

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
} from '#modules/search/actions/queries/global_search_query'

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

export interface SearchTalentProjectionPort extends SearchDocumentProjectionPort {
  ensureIndex(): Promise<void>
  resetIndex(): Promise<void>
}

export interface GlobalSearchQueryPort {
  handle(rawQuery: string, options?: GlobalSearchQueryOptions): Promise<GlobalSearchResult>
}

interface SearchPublicApiDependencies {
  runtime?: SearchRuntimePort
  talents?: SearchTalentProjectionPort
  tasks?: SearchRemovableProjectionPort
  projects?: SearchRemovableProjectionPort
  skills?: SearchDocumentProjectionPort
  organizations?: SearchRemovableProjectionPort
  userDirectory?: SearchRemovableProjectionPort
  makeGlobalSearchQuery?: (execCtx: HttpActionContext) => GlobalSearchQueryPort
}

export class SearchPublicApi {
  private readonly runtime: SearchRuntimePort
  private readonly talents: SearchTalentProjectionPort
  private readonly tasks: SearchRemovableProjectionPort
  private readonly projects: SearchRemovableProjectionPort
  private readonly skills: SearchDocumentProjectionPort
  private readonly organizations: SearchRemovableProjectionPort
  private readonly userDirectory: SearchRemovableProjectionPort
  private readonly makeGlobalSearchQuery: (execCtx: HttpActionContext) => GlobalSearchQueryPort

  constructor(dependencies: SearchPublicApiDependencies = {}) {
    this.runtime = dependencies.runtime ?? new SearchRuntimeService()
    this.talents = dependencies.talents ?? new TalentSearchProjectionService()
    this.tasks = dependencies.tasks ?? new TaskSearchProjectionService()
    this.projects = dependencies.projects ?? new ProjectSearchProjectionService()
    this.skills = dependencies.skills ?? new SkillSearchProjectionService()
    this.organizations = dependencies.organizations ?? new OrganizationSearchProjectionService()
    this.userDirectory =
      dependencies.userDirectory ?? new UserDirectorySearchProjectionService()
    this.makeGlobalSearchQuery =
      dependencies.makeGlobalSearchQuery ?? ((execCtx) => new GlobalSearchQuery(execCtx))
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

  async reindexTalentDocument(userId: string): Promise<void> {
    await this.talents.reindexDocument(userId)
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

  async reindexProjectDocument(projectId: string): Promise<void> {
    await this.projects.reindexDocument(projectId)
  }

  async reindexProjectDocumentQuietly(projectId: string): Promise<void> {
    await this.projects.reindexDocumentQuietly(projectId)
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

export const searchPublicApi = new SearchPublicApi()
