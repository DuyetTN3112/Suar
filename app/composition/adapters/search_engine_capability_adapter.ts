import type {
  SearchEngineCapability,
  SearchOrganizationCandidate,
  SearchOrganizationTaskInput,
  SearchProjectCandidate,
  SearchSkillCandidate,
  SearchTaskCandidate,
  SearchTextInput,
  SearchUserCandidate,
} from '#modules/search/public_contracts/search_engine'

interface SearchRuntimeStatus {
  isEnabled(): boolean
}

interface TextSearchQuery<Result> {
  handle(input: SearchTextInput): Promise<Result[]>
}

interface OrganizationTaskSearchQuery {
  handle(input: SearchOrganizationTaskInput): Promise<SearchTaskCandidate[]>
}

interface TalentSearchQuery {
  handle(input: SearchTextInput, signal?: AbortSignal): Promise<SearchUserCandidate[]>
}

export interface SearchEngineCapabilityAdapterDependencies {
  runtime: SearchRuntimeStatus
  projects: TextSearchQuery<SearchProjectCandidate>
  users: TextSearchQuery<SearchUserCandidate>
  organizations: TextSearchQuery<SearchOrganizationCandidate>
  tasks: OrganizationTaskSearchQuery
  publicTasks: TextSearchQuery<SearchTaskCandidate>
  talents: TalentSearchQuery
  skills: TextSearchQuery<SearchSkillCandidate>
}

export class SearchEngineCapabilityAdapter implements SearchEngineCapability {
  constructor(private readonly dependencies: SearchEngineCapabilityAdapterDependencies) {}

  isEnabled(): boolean {
    return this.dependencies.runtime.isEnabled()
  }

  searchProjects(input: SearchTextInput): Promise<SearchProjectCandidate[]> {
    return this.dependencies.projects.handle(input)
  }

  searchUsers(input: SearchTextInput): Promise<SearchUserCandidate[]> {
    return this.dependencies.users.handle(input)
  }

  searchOrganizations(input: SearchTextInput): Promise<SearchOrganizationCandidate[]> {
    return this.dependencies.organizations.handle(input)
  }

  searchTasks(input: SearchOrganizationTaskInput): Promise<SearchTaskCandidate[]> {
    return this.dependencies.tasks.handle(input)
  }

  searchPublicTasks(input: SearchTextInput): Promise<SearchTaskCandidate[]> {
    return this.dependencies.publicTasks.handle(input)
  }

  searchTalents(input: SearchTextInput, signal?: AbortSignal): Promise<SearchUserCandidate[]> {
    return this.dependencies.talents.handle(input, signal)
  }

  searchSkills(input: SearchTextInput): Promise<SearchSkillCandidate[]> {
    return this.dependencies.skills.handle(input)
  }
}
