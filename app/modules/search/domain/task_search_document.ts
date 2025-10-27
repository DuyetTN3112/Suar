export interface TaskSearchDocument {
  task_id: string
  organization_id: string
  title: string
  description: string
  acceptance_criteria: string
  context_background: string | null
  required_skill_ids: string[]
  required_skills_text: string
  business_domain: string | null
  problem_category: string | null
  task_type: string | null
  difficulty: string | null
  task_visibility: string
  is_public: boolean
  assigned_to: string | null
  deleted_at: string | null
  updated_at: string
}

export interface TaskSearchHit {
  taskId: string
  score: number
}
