import type {
  OrganizationSearchDocument,
  OrganizationSearchHit,
} from '#modules/search/domain/entity-search/organization_search_document'
import type {
  ProjectSearchDocument,
  ProjectSearchHit,
} from '#modules/search/domain/entity-search/project_search_document'
import type {
  SkillSearchDocument,
  SkillSearchHit,
} from '#modules/search/domain/entity-search/skill_search_document'
import type {
  TalentSearchDocument,
  TalentSearchHit,
} from '#modules/search/domain/entity-search/talent_search_document'
import type {
  TaskSearchDocument,
  TaskSearchHit,
} from '#modules/search/domain/entity-search/task_search_document'
import type {
  UserDirectorySearchDocument,
  UserDirectorySearchHit,
} from '#modules/search/domain/entity-search/user_directory_search_document'
import type { SearchProjectionWriteContext } from '#modules/search/public_contracts/search_public_api'

export interface OrganizationSearchDocumentBuilderPort {
  build(organizationId: string): Promise<OrganizationSearchDocument>
}

export interface ProjectSearchDocumentBuilderPort {
  build(projectId: string): Promise<ProjectSearchDocument | null>
}

export interface SkillSearchDocumentBuilderPort {
  build(skillId: string): Promise<SkillSearchDocument>
}

export interface TalentSearchDocumentBuilderPort {
  build(userId: string, signal?: AbortSignal): Promise<TalentSearchDocument | null>
}

export interface TaskSearchDocumentBuilderPort {
  build(taskId: string): Promise<TaskSearchDocument>
}

export interface UserDirectorySearchDocumentBuilderPort {
  build(userId: string, signal?: AbortSignal): Promise<UserDirectorySearchDocument | null>
}

export interface OrganizationSearchStore {
  readonly indexName: string
  upsertDocument(document: OrganizationSearchDocument): Promise<void>
  replaceAllDocuments(documents: OrganizationSearchDocument[]): Promise<void>
  deleteDocument(organizationId: string): Promise<void>
  search(input: { q: string; limit: number }): Promise<OrganizationSearchHit[]>
}

export interface ProjectSearchStore {
  readonly indexName: string
  upsertDocument(
    document: ProjectSearchDocument,
    context?: SearchProjectionWriteContext
  ): Promise<void>
  replaceAllDocuments(documents: ProjectSearchDocument[]): Promise<void>
  deleteDocument(projectId: string, context?: SearchProjectionWriteContext): Promise<void>
  search(input: { q: string; limit: number }): Promise<ProjectSearchHit[]>
}

export interface SkillSearchStore {
  readonly indexName: string
  upsertDocument(document: SkillSearchDocument): Promise<void>
  replaceAllDocuments(documents: SkillSearchDocument[]): Promise<void>
  deleteDocument(skillId: string): Promise<void>
  search(input: { q: string; limit: number }): Promise<SkillSearchHit[]>
}

export interface TalentSearchStore {
  readonly indexName: string
  ensureIndex(signal?: AbortSignal): Promise<void>
  resetIndex(): Promise<void>
  upsertDocument(document: TalentSearchDocument, signal?: AbortSignal): Promise<void>
  upsertDocumentFenced(
    document: TalentSearchDocument,
    context: SearchProjectionWriteContext
  ): Promise<void>
  replaceAllDocuments(documents: TalentSearchDocument[]): Promise<void>
  deleteDocument(userId: string, signal?: AbortSignal): Promise<void>
  deleteDocumentFenced(userId: string, context: SearchProjectionWriteContext): Promise<void>
  search(
    input: { q: string; limit: number },
    signal?: AbortSignal
  ): Promise<TalentSearchHit[]>
}

export interface TaskSearchStore {
  readonly indexName: string
  upsertDocument(document: TaskSearchDocument): Promise<void>
  replaceAllDocuments(documents: TaskSearchDocument[]): Promise<void>
  deleteDocument(taskId: string): Promise<void>
  search(input: {
    q: string
    limit: number
    organizationId?: string
    publicOnly?: boolean
  }): Promise<TaskSearchHit[]>
}

export interface UserDirectorySearchStore {
  readonly indexName: string
  upsertDocument(document: UserDirectorySearchDocument): Promise<void>
  upsertDocumentFenced(
    document: UserDirectorySearchDocument,
    context: SearchProjectionWriteContext
  ): Promise<void>
  replaceAllDocuments(documents: UserDirectorySearchDocument[]): Promise<void>
  deleteDocument(userId: string): Promise<void>
  deleteDocumentFenced(userId: string, context: SearchProjectionWriteContext): Promise<void>
  search(input: { q: string; limit: number }): Promise<UserDirectorySearchHit[]>
}
