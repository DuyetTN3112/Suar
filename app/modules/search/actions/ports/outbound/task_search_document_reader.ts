import type {
  TaskSearchCanonicalMetadata,
  TaskSearchClassificationCoverage,
} from '#modules/search/domain/entity-search/task_search_document'

export interface TaskSearchDocumentSkillRecord {
  skillId: string
  skillName: string
  categoryCode: string
}

export interface TaskSearchDocumentRecord {
  taskId: string
  organizationId: string | null
  creatorId: string
  projectId: string | null
  title: string
  description: string | null
  acceptanceCriteria: string | null
  contextBackground: string | null
  requiredSkills: TaskSearchDocumentSkillRecord[]
  businessDomains: string[]
  businessDomainsCoverage: TaskSearchClassificationCoverage
  problemCategories: string[]
  problemCategoriesCoverage: TaskSearchClassificationCoverage
  taskTypes: string[]
  taskTypesCoverage: TaskSearchClassificationCoverage
  difficulty: string | null
  status: string
  label: string
  priority: string
  taskVisibility: string
  assignedTo: string | null
  verificationMethod: string
  techStack: string[]
  techStackKnown: boolean
  domainTags: string[]
  domainTagsKnown: boolean
  learningObjectives: string[]
  learningObjectivesKnown: boolean
  canonicalMetadata?: TaskSearchCanonicalMetadata
  roleInTask: string | null
  autonomyLevel: string | null
  collaborationType: string | null
  impactScope: string | null
  environment: string | null
  applicationDeadline: string | null
  dueDate: string | null
  createdAt: string
  estimatedUsersAffected: number | null
  externalApplicationsCount: number
  deletedAt: string | null
  updatedAt: string
}

export interface TaskSearchDocumentReader {
  findTaskSearchDocumentRecord(taskId: string): Promise<TaskSearchDocumentRecord>
}
