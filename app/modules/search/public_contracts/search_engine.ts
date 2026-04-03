export interface SearchTextInput {
  q: string
  limit: number
}

export interface SearchOrganizationTaskInput extends SearchTextInput {
  organizationId: string
}

export interface SearchProjectCandidate {
  projectId: string
  score: number
}

export interface SearchUserCandidate {
  userId: string
  score: number
}

export interface SearchOrganizationCandidate {
  organizationId: string
  score: number
}

export interface SearchTaskCandidate {
  taskId: string
  score: number
}

export interface SearchSkillCandidate {
  skillId: string
  score: number
}

export interface SearchEngineCapability {
  isEnabled(): boolean
  searchProjects(input: SearchTextInput): Promise<SearchProjectCandidate[]>
  searchUsers(input: SearchTextInput): Promise<SearchUserCandidate[]>
  searchOrganizations(input: SearchTextInput): Promise<SearchOrganizationCandidate[]>
  searchTasks(input: SearchOrganizationTaskInput): Promise<SearchTaskCandidate[]>
  searchPublicTasks(input: SearchTextInput): Promise<SearchTaskCandidate[]>
  searchTalents(input: SearchTextInput, signal?: AbortSignal): Promise<SearchUserCandidate[]>
  searchSkills(input: SearchTextInput): Promise<SearchSkillCandidate[]>
}
