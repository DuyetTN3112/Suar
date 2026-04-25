import { TalentPublicAccomplishmentReaderAdapter } from '#composition/adapters/accomplishments/publication/talent_public_accomplishment_reader_adapter'
import { SearchPublicApiAdapter } from '#composition/adapters/search/search_public_api_adapter'
import { organizationDirectoryCapability } from '#composition/organizations/search/organization_search_composition'
import { projectsSearchComposition } from '#composition/projects/project-search/projects_search_composition'
import { searchRuntime } from '#composition/search/search-engine/search_engine_composition'
import { activeSkillCatalogCapability } from '#composition/skills/skill-search/skills_search_composition'
import {
  taskSearchDocumentReader,
  taskSearchSyncReader,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { makeGetPublicTasksQuery } from '#composition/tasks/task-search/tasks_search_composition'
import { userExternalDependencies } from '#composition/users/user-external-dependencies/user_external_dependencies_composition'
import { userTalentRepository } from '#composition/users/user-persistence/user_persistence_composition'
import { userTalentQueryFactory } from '#composition/users/user-reading/user_query_composition'
import { makeSearchTalentsQuery } from '#composition/users/user-search/users_search_composition'
import { searchConfig } from '#config/search'
import { accomplishmentPublicProjectionReader } from '#modules/accomplishments/infra/repositories/publication/accomplishment_public_projection_reader'
import { ExecuteFilterQuery } from '#modules/filtering/actions/queries/filtering-runtime/execute_filter_query'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { filterObservabilityLoggerSink } from '#modules/filtering/observability/filtering-observability/filter_observability_logger_sink'
import { LucidOrganizationSearchDocumentReader } from '#modules/organizations/infra/adapters/directory/lucid_organization_search_document_reader'
import { LucidOrganizationSearchSyncReader } from '#modules/organizations/infra/adapters/directory/lucid_organization_search_sync_reader'
import { LucidProjectSearchDocumentReader } from '#modules/projects/infra/adapters/project-context/lucid_project_search_document_reader'
import { LucidProjectSearchSyncReader } from '#modules/projects/infra/adapters/project-context/lucid_project_search_sync_reader'
import { OrganizationSearchProjectionCommands } from '#modules/search/actions/commands/projections/organization_search_projection_commands'
import { ProjectSearchProjectionCommands } from '#modules/search/actions/commands/projections/project_search_projection_commands'
import { SkillSearchProjectionCommands } from '#modules/search/actions/commands/projections/skill_search_projection_commands'
import { TalentSearchProjectionCommands } from '#modules/search/actions/commands/projections/talent_search_projection_commands'
import { TaskSearchProjectionCommands } from '#modules/search/actions/commands/projections/task_search_projection_commands'
import { UserDirectorySearchProjectionCommands } from '#modules/search/actions/commands/projections/user_directory_search_projection_commands'
import { GlobalSearchQuery } from '#modules/search/actions/queries/search-discovery/global_search_query'
import { SearchDiscoveryQuery } from '#modules/search/actions/queries/search-discovery/search_discovery_query'
import { OrganizationSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/organizations/organization_search_document_builder'
import { ProjectSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/projects/project_search_document_builder'
import { SkillSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/skills/skill_search_document_builder'
import { TalentSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/talents/talent_search_document_builder'
import { LucidSearchTaskCommentReader } from '#modules/search/infra/adapters/entity-search/tasks/lucid_search_task_comment_reader'
import {
  mapTaskSearchDiscoveryHit,
  TASK_SEARCH_DISCOVERY_BINDINGS,
  TASK_SEARCH_DISCOVERY_ID_FIELD,
  TASK_SEARCH_DISCOVERY_RANKING_VERSION,
  TASK_SEARCH_DISCOVERY_TEXT_FIELDS,
  type TaskSearchDiscoveryDocument,
} from '#modules/search/infra/adapters/entity-search/tasks/task_search_discovery_bindings'
import { TaskSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/tasks/task_search_document_builder'
import { UserDirectorySearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/users/user_directory_search_document_builder'
import { PostgresSearchIndexCutoverFence } from '#modules/search/infra/adapters/index-administration/postgres_search_index_cutover_fence'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import { ElasticsearchFilterQueryExecutor } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import {
  searchDiscoveryClock,
} from '#modules/search/infra/adapters/search-discovery/search_discovery_clock'
import {
  mapTalentSearchDiscoveryHit,
  TALENT_SEARCH_DISCOVERY_BINDINGS,
  TALENT_SEARCH_DISCOVERY_ID_FIELD,
  TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
  TALENT_SEARCH_DISCOVERY_TEXT_FIELDS,
  type TalentSearchDiscoveryDocument,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_bindings'
import {
  TALENT_DISCOVERY_CONTEXTS,
  TALENT_DISCOVERY_EXECUTION_PROFILE,
  TalentDiscoveryFilterContextProvider,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_filter_context'
import { TalentDiscoveryPermissionProvider } from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_permission_provider'
import { OrganizationSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/organizations/organization_search_index_repository'
import { ProjectSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'
import { SkillSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/skills/skill_search_index_repository'
import { TalentSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'
import { TaskSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import { UserDirectorySearchIndexRepository } from '#modules/search/infra/repositories/entity-search/users/user_directory_search_index_repository'
import type { SearchPublicApiV2 } from '#modules/search/public_contracts/search_public_api'
import { LucidSkillSearchDocumentReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_search_document_reader'
import { LucidSkillSearchSyncReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_search_sync_reader'
import { LucidSkillTaxonomyCatalogReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_taxonomy_catalog_reader'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import {
  TASK_DISCOVERY_CONTEXTS,
  TASK_DISCOVERY_EXECUTION_PROFILE,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'
import { TaskDiscoveryPermissionProvider } from '#modules/tasks/public_contracts/task-discovery/task_discovery_permission_provider'
import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/talent/lucid_talent_search_document_reader'
import { LucidUserDirectorySearchDocumentReader } from '#modules/users/infra/adapters/talent/lucid_user_directory_search_document_reader'
import { LucidUserSearchSyncReader } from '#modules/users/infra/adapters/talent/lucid_user_search_sync_reader'
import { SearchTalentDiscoveryReaderAdapter } from '#modules/users/infra/adapters/talent/search_talent_discovery_reader_adapter'
import { searchClient } from '#platform/search/elasticsearch_client'

const organizationDocumentReader = new LucidOrganizationSearchDocumentReader()
const organizationSyncReader = new LucidOrganizationSearchSyncReader()
const projectDocumentReader = new LucidProjectSearchDocumentReader()
const projectSyncReader = new LucidProjectSearchSyncReader()
const skillDocumentReader = new LucidSkillSearchDocumentReader()
const skillSyncReader = new LucidSkillSearchSyncReader()
const talentDocumentReader = new LucidTalentSearchDocumentReader(
  userExternalDependencies.skillCatalog,
  userTalentRepository,
  new TalentPublicAccomplishmentReaderAdapter(accomplishmentPublicProjectionReader),
  new LucidSkillTaxonomyCatalogReader()
)
const userDirectoryDocumentReader = new LucidUserDirectorySearchDocumentReader()
const userSyncReader = new LucidUserSearchSyncReader()
const searchIndexCutoverFence = new PostgresSearchIndexCutoverFence()
const searchTaskCommentReader = new LucidSearchTaskCommentReader()
const taskDiscoveryIndex = new TaskSearchIndexRepository(searchIndexCutoverFence)
const talentDiscoveryIndex = new TalentSearchIndexRepository(undefined, searchIndexCutoverFence)

const organizations = new OrganizationSearchProjectionCommands(
  new OrganizationSearchIndexRepository(searchIndexCutoverFence),
  new OrganizationSearchDocumentBuilder(organizationDocumentReader),
  organizationSyncReader,
  searchRuntime
)
const projects = new ProjectSearchProjectionCommands(
  new ProjectSearchIndexRepository(undefined, searchIndexCutoverFence),
  new ProjectSearchDocumentBuilder(projectDocumentReader),
  projectSyncReader,
  searchRuntime
)
const skills = new SkillSearchProjectionCommands(
  new SkillSearchIndexRepository(searchIndexCutoverFence),
  new SkillSearchDocumentBuilder(skillDocumentReader),
  skillSyncReader,
  searchRuntime
)
const talents = new TalentSearchProjectionCommands(
  talentDiscoveryIndex,
  new TalentSearchDocumentBuilder(talentDocumentReader),
  userSyncReader,
  searchRuntime
)
const tasks = new TaskSearchProjectionCommands(
  taskDiscoveryIndex,
  new TaskSearchDocumentBuilder(taskSearchDocumentReader),
  taskSearchSyncReader,
  searchRuntime
)

const taskDiscoveryExecutor = new ElasticsearchFilterQueryExecutor<
  ReturnType<typeof mapTaskSearchDiscoveryHit>
>({
  client: searchClient,
  indexName: taskDiscoveryIndex.indexName,
  profile: TASK_DISCOVERY_EXECUTION_PROFILE,
  bindings: TASK_SEARCH_DISCOVERY_BINDINGS,
  idField: TASK_SEARCH_DISCOVERY_ID_FIELD,
  textFields: TASK_SEARCH_DISCOVERY_TEXT_FIELDS,
  cursorCodec: new ElasticsearchCursorCodec({
    secret: searchConfig.discoveryCursorSecret,
    ttlMs: searchConfig.discoveryCursorTtlMs,
    clock: searchDiscoveryClock,
  }),
  rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
  resolveIndexTarget: () => taskDiscoveryIndex.resolveActiveIndexTarget(),
  mapHit: mapTaskSearchDiscoveryHit,
  requestTimeoutMs: searchConfig.requestTimeoutMs,
  clock: searchDiscoveryClock,
})
export const taskDiscoveryFilter = new ExecuteFilterQuery({
  contextProvider: new TaskDiscoveryFilterContextProvider(),
  permissionProvider: new TaskDiscoveryPermissionProvider(),
  executorResolver: {
    getExecutor: (profile) =>
      profile === TASK_DISCOVERY_EXECUTION_PROFILE ? taskDiscoveryExecutor : undefined,
  },
  timeoutMs: searchConfig.requestTimeoutMs + 1_000,
  hashGenerator: new NodeFilterHashGenerator(),
  observabilitySink: filterObservabilityLoggerSink,
})
const talentDiscoveryExecutor = new ElasticsearchFilterQueryExecutor<
  ReturnType<typeof mapTalentSearchDiscoveryHit>
>({
  client: searchClient,
  indexName: talentDiscoveryIndex.indexName,
  profile: TALENT_DISCOVERY_EXECUTION_PROFILE,
  bindings: TALENT_SEARCH_DISCOVERY_BINDINGS,
  idField: TALENT_SEARCH_DISCOVERY_ID_FIELD,
  textFields: TALENT_SEARCH_DISCOVERY_TEXT_FIELDS,
  cursorCodec: new ElasticsearchCursorCodec({
    secret: searchConfig.discoveryCursorSecret,
    ttlMs: searchConfig.discoveryCursorTtlMs,
    clock: searchDiscoveryClock,
  }),
  rankingVersion: TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
  resolveIndexTarget: () => talentDiscoveryIndex.resolveActiveIndexTarget(),
  mapHit: mapTalentSearchDiscoveryHit,
  requestTimeoutMs: searchConfig.requestTimeoutMs,
  clock: searchDiscoveryClock,
})
export const talentDiscoveryFilter = new ExecuteFilterQuery({
  contextProvider: new TalentDiscoveryFilterContextProvider(),
  permissionProvider: new TalentDiscoveryPermissionProvider(),
  executorResolver: {
    getExecutor: (profile) =>
      profile === TALENT_DISCOVERY_EXECUTION_PROFILE ? talentDiscoveryExecutor : undefined,
  },
  timeoutMs: searchConfig.requestTimeoutMs + 1_000,
  hashGenerator: new NodeFilterHashGenerator(),
  observabilitySink: filterObservabilityLoggerSink,
})
const userDirectory = new UserDirectorySearchProjectionCommands(
  new UserDirectorySearchIndexRepository(undefined, searchIndexCutoverFence),
  new UserDirectorySearchDocumentBuilder(userDirectoryDocumentReader),
  userSyncReader,
  searchRuntime
)

export const searchPublicApi: SearchPublicApiV2 = new SearchPublicApiAdapter({
  runtime: searchRuntime,
  talents,
  tasks,
  projects,
  skills,
  organizations,
  userDirectory,
  makeGlobalSearchQuery: (execCtx) =>
    new GlobalSearchQuery(execCtx, {
      searchTalents: (input, context, signal) =>
        makeSearchTalentsQuery(context).handle({
          ...input,
          ...(signal ? { signal } : {}),
        }),
      listPublicTasks: async (input, context) => {
        const result = await makeGetPublicTasksQuery(context).handle(
          GetPublicTasksDTO.fromFilters(input)
        )

        return {
          data: result.data.map((task) => ({ ...task })),
          meta: result.meta,
        }
      },
      listProjects: (input, context) => projectsSearchComposition.listProjects(input, context),
      listActiveSkillsCatalog: (input) => activeSkillCatalogCapability.list(input),
      searchOrganizationsBasicList: (query, limit) =>
        organizationDirectoryCapability.searchBasicList(query, limit),
      searchTaskComments: (query, limit) => searchTaskCommentReader.search(query, limit),
    }),
  makeSearchDiscoveryQuery: (execCtx) =>
    new SearchDiscoveryQuery<TaskSearchDiscoveryDocument | TalentSearchDiscoveryDocument>({
      verticals: [
        {
          scope: 'task',
          source: 'tasks',
          contexts: Object.values(TASK_DISCOVERY_CONTEXTS),
          rankingVersion: TASK_SEARCH_DISCOVERY_RANKING_VERSION,
          supportedRetrievalModes: ['auto', 'lexical'],
          execute: (input) => taskDiscoveryFilter.execute(input),
        },
        {
          scope: 'talent',
          source: 'talents',
          contexts: Object.values(TALENT_DISCOVERY_CONTEXTS),
          rankingVersion: TALENT_SEARCH_DISCOVERY_RANKING_VERSION,
          supportedRetrievalModes: ['auto', 'lexical'],
          execute: (input) => talentDiscoveryFilter.execute(input),
        },
      ],
      legacyGlobalSearch: (legacyQuery, options) =>
        new GlobalSearchQuery(execCtx, {
          searchTalents: (input, context, signal) =>
            makeSearchTalentsQuery(context).handle({
              ...input,
              ...(signal ? { signal } : {}),
            }),
          listPublicTasks: async (input, context) => {
            const result = await makeGetPublicTasksQuery(context).handle(
              GetPublicTasksDTO.fromFilters(input)
            )
            return { data: result.data.map((task) => ({ ...task })), meta: result.meta }
          },
          listProjects: (input, context) => projectsSearchComposition.listProjects(input, context),
          listActiveSkillsCatalog: (input) => activeSkillCatalogCapability.list(input),
          searchOrganizationsBasicList: (organizationQuery, limit) =>
            organizationDirectoryCapability.searchBasicList(organizationQuery, limit),
          searchTaskComments: (commentQuery, limit) =>
            searchTaskCommentReader.search(commentQuery, limit),
        }).handle(legacyQuery, options),
  }),
})

userTalentQueryFactory.configureTalentDiscoveryReader(
  new SearchTalentDiscoveryReaderAdapter(searchPublicApi)
)
