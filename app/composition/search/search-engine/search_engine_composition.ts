import { SearchEngineCapabilityAdapter } from '#composition/adapters/search/search_engine_capability_adapter'
import { searchConfig } from '#config/search'
import { SearchOrganizationsViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_organizations_via_engine_query'
import { SearchProjectsViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_projects_via_engine_query'
import { SearchPublicTasksViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_public_tasks_via_engine_query'
import { SearchSkillsViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_skills_via_engine_query'
import { SearchTalentsViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_talents_via_engine_query'
import { SearchTasksViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_tasks_via_engine_query'
import { SearchUsersViaEngineQuery } from '#modules/search/actions/queries/entity-search/search_users_via_engine_query'
import { SearchRuntimeAdapter } from '#modules/search/infra/adapters/search-discovery/search_runtime_adapter'
import { OrganizationSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/organizations/organization_search_index_repository'
import { ProjectSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/projects/project_search_index_repository'
import { SkillSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/skills/skill_search_index_repository'
import { TalentSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'
import { TaskSearchIndexRepository } from '#modules/search/infra/repositories/entity-search/tasks/task_search_index_repository'
import { UserDirectorySearchIndexRepository } from '#modules/search/infra/repositories/entity-search/users/user_directory_search_index_repository'
import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'
import { searchClient } from '#platform/search/elasticsearch_client'

export const searchRuntime = new SearchRuntimeAdapter(searchClient, {
  isEnabled: () => searchConfig.enabled,
})

export const searchEngineCapability: SearchEngineCapability =
  new SearchEngineCapabilityAdapter({
    runtime: searchRuntime,
    projects: new SearchProjectsViaEngineQuery(new ProjectSearchIndexRepository()),
    users: new SearchUsersViaEngineQuery(new UserDirectorySearchIndexRepository()),
    organizations: new SearchOrganizationsViaEngineQuery(
      new OrganizationSearchIndexRepository()
    ),
    tasks: new SearchTasksViaEngineQuery(new TaskSearchIndexRepository()),
    publicTasks: new SearchPublicTasksViaEngineQuery(new TaskSearchIndexRepository()),
    talents: new SearchTalentsViaEngineQuery(new TalentSearchIndexRepository()),
    skills: new SearchSkillsViaEngineQuery(new SkillSearchIndexRepository()),
  })
