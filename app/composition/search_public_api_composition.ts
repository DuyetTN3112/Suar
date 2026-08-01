import { SearchPublicApiAdapter } from '#composition/adapters/search_public_api_adapter'
import { organizationDirectoryCapability } from '#composition/organization_search_composition'
import { projectsSearchComposition } from '#composition/projects_search_composition'
import { searchRuntime } from '#composition/search_engine_composition'
import { activeSkillCatalogCapability } from '#composition/skills_search_composition'
import {
  taskSearchDocumentReader,
  taskSearchSyncReader,
} from '#composition/task_external_dependencies_composition'
import { makeGetPublicTasksQuery } from '#composition/tasks_search_composition'
import { userExternalDependencies } from '#composition/user_external_dependencies_composition'
import { userTalentRepository } from '#composition/user_persistence_composition'
import { makeSearchTalentsQuery } from '#composition/users_search_composition'
import { LucidOrganizationSearchDocumentReader } from '#modules/organizations/directory/infra/adapters/lucid_organization_search_document_reader'
import { LucidOrganizationSearchSyncReader } from '#modules/organizations/directory/infra/adapters/lucid_organization_search_sync_reader'
import { LucidProjectSearchDocumentReader } from '#modules/projects/infra/adapters/lucid_project_search_document_reader'
import { LucidProjectSearchSyncReader } from '#modules/projects/infra/adapters/lucid_project_search_sync_reader'
import { OrganizationSearchProjectionCommands } from '#modules/search/actions/commands/projections/organization_search_projection_commands'
import { ProjectSearchProjectionCommands } from '#modules/search/actions/commands/projections/project_search_projection_commands'
import { SkillSearchProjectionCommands } from '#modules/search/actions/commands/projections/skill_search_projection_commands'
import { TalentSearchProjectionCommands } from '#modules/search/actions/commands/projections/talent_search_projection_commands'
import { TaskSearchProjectionCommands } from '#modules/search/actions/commands/projections/task_search_projection_commands'
import { UserDirectorySearchProjectionCommands } from '#modules/search/actions/commands/projections/user_directory_search_projection_commands'
import { GlobalSearchQuery } from '#modules/search/actions/queries/global_search_query'
import { LucidSearchTaskCommentReader } from '#modules/search/infra/adapters/lucid_search_task_comment_reader'
import { PostgresSearchIndexCutoverFence } from '#modules/search/infra/adapters/postgres_search_index_cutover_fence'
import { OrganizationSearchDocumentBuilder } from '#modules/search/infra/organizations/organization_search_document_builder'
import { OrganizationSearchIndexRepository } from '#modules/search/infra/organizations/organization_search_index_repository'
import { ProjectSearchDocumentBuilder } from '#modules/search/infra/projects/project_search_document_builder'
import { ProjectSearchIndexRepository } from '#modules/search/infra/projects/project_search_index_repository'
import { SkillSearchDocumentBuilder } from '#modules/search/infra/skills/skill_search_document_builder'
import { SkillSearchIndexRepository } from '#modules/search/infra/skills/skill_search_index_repository'
import { TalentSearchDocumentBuilder } from '#modules/search/infra/talents/talent_search_document_builder'
import { TalentSearchIndexRepository } from '#modules/search/infra/talents/talent_search_index_repository'
import { TaskSearchDocumentBuilder } from '#modules/search/infra/tasks/task_search_document_builder'
import { TaskSearchIndexRepository } from '#modules/search/infra/tasks/task_search_index_repository'
import { UserDirectorySearchDocumentBuilder } from '#modules/search/infra/users/user_directory_search_document_builder'
import { UserDirectorySearchIndexRepository } from '#modules/search/infra/users/user_directory_search_index_repository'
import type { SearchPublicApi } from '#modules/search/public_contracts/search_public_api'
import { LucidSkillSearchDocumentReader } from '#modules/skills/infra/adapters/lucid_skill_search_document_reader'
import { LucidSkillSearchSyncReader } from '#modules/skills/infra/adapters/lucid_skill_search_sync_reader'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/lucid_talent_search_document_reader'
import { LucidUserDirectorySearchDocumentReader } from '#modules/users/infra/adapters/lucid_user_directory_search_document_reader'
import { LucidUserSearchSyncReader } from '#modules/users/infra/adapters/lucid_user_search_sync_reader'

const organizationDocumentReader = new LucidOrganizationSearchDocumentReader()
const organizationSyncReader = new LucidOrganizationSearchSyncReader()
const projectDocumentReader = new LucidProjectSearchDocumentReader()
const projectSyncReader = new LucidProjectSearchSyncReader()
const skillDocumentReader = new LucidSkillSearchDocumentReader()
const skillSyncReader = new LucidSkillSearchSyncReader()
const talentDocumentReader = new LucidTalentSearchDocumentReader(
  userExternalDependencies.skillCatalog,
  userTalentRepository
)
const userDirectoryDocumentReader = new LucidUserDirectorySearchDocumentReader()
const userSyncReader = new LucidUserSearchSyncReader()
const searchIndexCutoverFence = new PostgresSearchIndexCutoverFence()
const searchTaskCommentReader = new LucidSearchTaskCommentReader()

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
  new TalentSearchIndexRepository(undefined, searchIndexCutoverFence),
  new TalentSearchDocumentBuilder(talentDocumentReader),
  userSyncReader,
  searchRuntime
)
const tasks = new TaskSearchProjectionCommands(
  new TaskSearchIndexRepository(searchIndexCutoverFence),
  new TaskSearchDocumentBuilder(taskSearchDocumentReader),
  taskSearchSyncReader,
  searchRuntime
)
const userDirectory = new UserDirectorySearchProjectionCommands(
  new UserDirectorySearchIndexRepository(undefined, searchIndexCutoverFence),
  new UserDirectorySearchDocumentBuilder(userDirectoryDocumentReader),
  userSyncReader,
  searchRuntime
)

export const searchPublicApi: SearchPublicApi = new SearchPublicApiAdapter({
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
})
