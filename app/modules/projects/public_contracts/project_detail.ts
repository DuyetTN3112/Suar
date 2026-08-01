export interface GetProjectDetailInput {
  projectId: string
  organizationId?: string
}

export interface GetProjectDetailResult {
  project: {
    id: string
    name: string
    description: string | null
    organization_id: string
    organization_name: string | null
    creator_id: string | null
    creator_name: string | null
    manager_id: string | null
    manager_name: string | null
    owner_id: string | null
    owner_name: string | null
    start_date: string | null
    end_date: string | null
    status: string
    visibility: string | null
    created_at: string | null
    updated_at: string | null
  }
  members: {
    user_id: string
    username: string
    email: string
    role: string
    project_professional_role_id: string | null
    professional_role_name: string | null
    professional_role_code: string | null
    joined_at: Date
    task_count: number
    reviewed_skills_count: number
    imported_skills_count: number
    under_dispute_skills_count: number
    latest_confidence_signal: 'low' | 'medium' | 'high' | null
  }[]
  tasks: {
    id: string
    title: string
    description: string | null
    status: string
    task_status_id: string | null
    priority: string | null
    assignee_name: string | null
    due_date: string | null
  }[]
  tasks_summary: {
    total: number
    pending: number
    in_progress: number
    completed: number
    overdue: number
  }
  recent_activity: {
    id: string
    user_id: string | null
    entity_type: string
    entity_id: string | null
    action: string
    created_at: Date
    username: string | null
  }[]
  permissions: {
    isOwner: boolean
    isManager: boolean
    isCreator: boolean
    isMember: boolean
    canEdit: boolean
    canDelete: boolean
    canAddMembers: boolean
  }
  review_governance: {
    total_sessions: number
    pending_sessions: number
    overdue_sessions: number
    disputed_sessions: number
    completed_sessions: number
    required_pending_assignments: number
    fallback_pending_assignments: number
    completion_rate: number
  }
  project_reverse_reviews: {
    total_reviews: number
    anonymous_reviews: number
    average_rating: number | null
    recent: {
      id: string
      reviewer_id: string | null
      reviewer_username: string | null
      rating: number
      comment: string | null
      is_anonymous: boolean
      created_at: string
    }[]
  }
}
