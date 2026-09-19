export interface OrgMembershipItem {
  org_name: string
  org_role: string
  joined_at: string
  status: string
}

export interface ProjectMembershipItem {
  project_name: string
  org_name: string | null
  project_role: string
  start_date: string | null
  end_date: string | null
  visibility: string
}

export interface DemonstratedWorkItem {
  taskAssignmentId?: string
  taskId?: string
  action: string | null
  object: string
  statement: string | null
  ownership: string | null
  context: {
    businessDomain: string | null
    problemCategory: string | null
    collaborationType: string | null
    environment: string | null
    scaleSummary: string | null
  }
  output: {
    title: string
    difficulty: string | null
  }
  outcome: {
    onTime: boolean | null
    qualityScore: number | null
  }
  verification: {
    status: 'review_confirmed' | 'admin_confirmed' | 'retrospective'
    confidence: 'high' | 'limited'
    method: string | null
    evidenceSufficiency:
      | 'pending'
      | 'adequate'
      | 'governed_exception'
      | 'inadequate'
      | null
  }
  capabilities?: Array<{
    name: string
    observedLevel: string
    declaredMinimumLevel?: string | null
    assessedTaskDifficultyLevel?: string | null
  }>
  completedAt: string | null
}

export interface WorkHistoryResult {
  organizations: OrgMembershipItem[]
  projects: ProjectMembershipItem[]
  demonstratedWork: DemonstratedWorkItem[]
  demonstratedWorkPagination?: {
    page: number
    perPage: number
    hasPreviousPage: boolean
    hasMore: boolean
  }
}

export interface GetUserWorkHistoryOptions {
  page?: unknown
  perPage?: unknown
  sort?: 'completed_asc' | 'completed_desc'
  verification?: 'review_confirmed' | 'admin_confirmed' | 'retrospective'
  action?: string
  ownership?: string
}
