export type UserKey =
  | 'owner'
  | 'superadmin'
  | 'member'
  | 'orgAdmin'
  | 'peerReviewer'
  | 'orgBOwner'
  | 'externalContributorOne'
  | 'externalContributorTwo'
  | 'securityOwner'
  | 'securityEngineer'
  | 'productResearcher'
  | 'frontendSpecialist'
  | 'backendSpecialist'
  | 'mobileEngineer'
  | 'dataAnalyst'
  | 'mlEngineer'
  | 'devopsEngineer'
  | 'uxDesigner'
  | 'qaAutomation'
  | 'technicalWriter'
  | 'communityManager'
  | 'agriProductOwner'
  | 'civicServiceLead'
  | 'commerceOwner'

export type OrgKey =
  | 'orgA'
  | 'orgB'
  | 'orgC'
  | 'orgD'
  | 'orgE'
  | 'orgF'
  | 'orgG'
  | 'orgH'
  | 'orgI'
  | 'orgJ'

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
  | 'orgFReviewOps'
  | 'orgFDeveloperExperience'
  | 'orgFReleaseReliability'
  | 'orgGCitizenPortal'
  | 'orgGComplaintResolution'
  | 'orgGAccessibilityAnalytics'
  | 'orgHFarmOperations'
  | 'orgHIotFieldMonitoring'
  | 'orgHKnowledgeHub'
  | 'orgISecureDelivery'
  | 'orgIIncidentReadiness'
  | 'orgIDependencyGovernance'
  | 'orgJSustainableCommerce'
  | 'orgJCustomerInsight'
  | 'orgJCreatorMarketplace'

export type StatusSlug =
  | 'todo'
  | 'in_progress'
  | 'done_dev'
  | 'in_testing'
  | 'rejected'
  | 'done'
  | 'cancelled'

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

export interface SeededSubmission { id: string; taskId: string; taskAssignmentId: string }

export interface SeededSprint { id: string; projectId: string; organizationId: string; status: string }

export interface SeedContext {
  users: Record<UserKey, SeededUser>
  organizations: Record<OrgKey, SeededOrg>
  projects: Record<ProjectKey, SeededProject>
  skills: Record<string, string>
  tasks: Record<string, SeededTask>
  assignments: Record<string, SeededAssignment>
  submissions: Record<string, SeededSubmission>
  sprints: Record<string, SeededSprint>
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
  /**
   * Opt-in demo fixture for optional evidence governance. It never represents
   * a requirement for the assignee to complete or move the task to Done.
   */
  seedGovernanceFixture?: boolean
  /**
   * `in_review` is accepted only as an input compatibility alias for the old demo pack.
   * The seeder persists it as the runtime `in_testing` status.
   */
  taskStatus: StatusSlug | 'in_review'
  label: 'bug' | 'feature' | 'enhancement' | 'documentation'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  visibility: 'project' | 'internal' | 'external' | 'all'
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
