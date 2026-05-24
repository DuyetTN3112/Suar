export interface MarketplacePublicTaskListingInput {
  page?: number
  per_page?: number
  task_ids?: string[] | null
  skill_categories?: string[] | null
  skill_ids?: string[] | null
  skill_match?: 'any' | 'all'
  keyword?: string | null
  difficulty?: string | null
  task_type?: string | null
  business_domain?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  verification_method?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  accepting_applications?: 'open' | 'closed' | null
  sort_by?: 'created_at' | 'due_date' | 'recommended'
  sort_order?: 'asc' | 'desc'
}

export interface MarketplaceTaskListingContext {
  userId: string | null
  organizationId: string | null
  ip: string
  userAgent: string
  requestId?: string | null
  traceId?: string | null
  workflowId?: string | null
}

export interface MarketplacePublicTaskListingResult {
  data: object[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
  }
}
