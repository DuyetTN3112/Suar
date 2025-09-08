export type UserKey =
  | 'owner'
  | 'superadmin'
  | 'member'
  | 'orgAdmin'
  | 'peerReviewer'
  | 'orgBOwner'
  | 'freelancerOne'
  | 'freelancerTwo'

export type OrgKey = 'orgA' | 'orgB' | 'orgC' | 'orgD' | 'orgE'

export type ProjectKey =
  | 'orgAPlatform'
  | 'orgAOperations'
  | 'orgADesignSystem'
  | 'orgAAnalytics'
  | 'orgBKnowledgeBase'
  | 'orgBCurriculumOps'
  | 'orgCMarketplaceLab'
  | 'orgDTalentShowcase'
  | 'orgEDataOps'
  | 'orgEInsightEngine'

export type StatusSlug = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

export interface SeededUser {
  id: string
  username: string
  email: string
  authMethod: 'google' | 'github'
  systemRole: 'superadmin' | 'registered_user'
}

export interface SeededOrg { id: string; name: string; slug: string }

export interface SeededProject { id: string; name: string; organizationId: string }

export interface SeededTask { id: string; title: string; organizationId: string; projectId: string | null }

export interface SeededAssignment { id: string; taskId: string; assigneeId: string }

export interface SeedContext {
  users: Record<UserKey, SeededUser>
  organizations: Record<OrgKey, SeededOrg>
  projects: Record<ProjectKey, SeededProject>
  skills: Record<string, string>
  tasks: Record<string, SeededTask>
  assignments: Record<string, SeededAssignment>
  snapshots: Record<string, string>
}

export type SeedWhereValue = string | number | boolean | Date | null

export type SeedRow = Record<string, unknown> & { id: string }

export interface TaskSpec {
  key: string
  organization: OrgKey
  project: ProjectKey
  creator: UserKey
  assignee?: UserKey
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'in_review' | 'done'
  taskStatus: StatusSlug
  label: 'bug' | 'feature' | 'enhancement' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  visibility: 'internal' | 'external' | 'all'
  dueDaysOffset: number
  assignmentCompletedDaysAgo?: number
  assignmentEstimatedHours?: number
  assignmentActualHours?: number
  taskType:
    | 'feature_development'
    | 'bug_fix'
    | 'documentation'
    | 'ui_ux_design'
    | 'qa_testing'
    | 'code_review'
    | 'devops_deployment'
    | 'technical_writing'
  acceptanceCriteria: string[]
  verificationMethod:
    | 'code_review'
    | 'manual_qa'
    | 'demo_presentation'
    | 'manager_approval'
    | 'documentation_review'
  expectedDeliverables: string[]
  contextBackground: string
  impactScope: 'team' | 'project' | 'organization' | 'end_users'
  techStack: string[]
  environment: 'development' | 'staging' | 'production' | 'mixed'
  collaborationType: 'solo' | 'small_team' | 'cross_team' | 'mentoring_junior' | 'pair_programming'
  complexityNotes: string
  measurableOutcomes: Record<string, unknown>[]
  learningObjectives: string[]
  domainTags: string[]
  roleInTask: 'lead' | 'contributor' | 'reviewer' | 'architect' | 'mentor'
  autonomyLevel: 'supervised' | 'autonomous' | 'led_others'
  problemCategory:
    | 'performance'
    | 'security'
    | 'maintainability'
    | 'new_capability'
    | 'automation'
    | 'technical_debt'
    | 'ux_improvement'
    | 'compliance'
  businessDomain: 'saas' | 'edtech' | 'internal_tooling' | 'data_platform' | 'security'
  estimatedUsersAffected: number
  estimatedBudget: number
  applicationDeadlineDaysAhead?: number
  requiredSkills: string[]
}

export interface GeneratedProjectTaskSeedConfig {
  organization: OrgKey
  targetTaskCount: number
  creators: UserKey[]
  assignees: UserKey[]
  titlePrefix: string
  businessDomain: TaskSpec['businessDomain']
  problemCategories: TaskSpec['problemCategory'][]
  techStack: string[]
  requiredSkills: string[]
}
