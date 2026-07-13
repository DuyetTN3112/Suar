export type TaskSearchClassificationCoverage = 'complete' | 'legacy_single_value' | 'missing'

export interface TaskSearchCanonicalMetadata {
  canonical_term_ids: string[]
  canonical_term_ids_known: true
  canonical_term_ids_count: number
  canonical_term_ids_by_namespace: Record<string, string[]>
  assignment_provenance: string[]
  assignment_review_states: string[]
  taxonomy_versions: string[]
  taxonomy_versions_by_namespace: Record<string, number>
  taxonomy_completeness?: string[]
  taxonomy_completeness_by_namespace?: Record<
    string,
    {
      resource: string
      entityId: string
      namespace: string
      state: string
      taxonomyVersion: number
      enrichmentVersion?: number
      projectedAt: string
      unresolvedCount: number
      belowThresholdCount: number
    }
  >
  metadata_assignment_schema_version?: number
  metadata_source_revisions?: string[]
  metadata_enrichment_versions_by_namespace?: Record<string, number>
}

export interface TaskSearchDocument {
  task_id: string
  organization_id: string | null
  creator_id: string
  project_id: string | null
  title: string
  description: string
  acceptance_criteria: string
  context_background: string | null
  required_skill_ids: string[]
  required_skill_ids_known?: true
  required_skill_ids_count?: number
  required_skill_category_codes?: string[]
  required_skill_category_codes_known?: true
  required_skill_category_codes_count?: number
  required_skills_text: string
  business_domains: string[]
  business_domains_coverage: TaskSearchClassificationCoverage
  business_domains_known?: true
  business_domains_count?: number
  problem_categories: string[]
  problem_categories_coverage: TaskSearchClassificationCoverage
  problem_categories_known?: true
  problem_categories_count?: number
  task_types: string[]
  task_types_coverage: TaskSearchClassificationCoverage
  task_types_known?: true
  task_types_count?: number
  difficulty: string | null
  status: string
  label: string
  priority: string
  task_visibility: string
  is_public: boolean
  is_deleted?: boolean
  marketplace_visible?: boolean
  application_eligible?: boolean
  member_visible?: boolean
  assigned_to: string | null
  verification_method: string
  tech_stack: string[]
  tech_stack_known?: true
  tech_stack_count?: number
  domain_tags: string[]
  domain_tags_known?: true
  domain_tags_count?: number
  learning_objectives: string[]
  learning_objectives_known?: true
  learning_objectives_count?: number
  canonical_term_ids?: string[]
  canonical_term_ids_known?: true
  canonical_term_ids_count?: number
  canonical_term_ids_by_namespace?: Record<string, string[]>
  assignment_provenance?: string[]
  assignment_review_states?: string[]
  taxonomy_versions?: string[]
  taxonomy_versions_by_namespace?: Record<string, number>
  taxonomy_completeness?: string[]
  taxonomy_completeness_by_namespace?: Record<
    string,
    {
      resource: string
      entityId: string
      namespace: string
      state: string
      taxonomyVersion: number
      enrichmentVersion?: number
      projectedAt: string
      unresolvedCount: number
      belowThresholdCount: number
    }
  >
  metadata_assignment_schema_version?: number
  metadata_source_revisions?: string[]
  metadata_enrichment_versions_by_namespace?: Record<string, number>
  role_in_task: string | null
  autonomy_level: string | null
  collaboration_type: string | null
  impact_scope: string | null
  environment: string | null
  application_deadline: string | null
  due_date: string | null
  created_at: string
  estimated_users_affected: number | null
  external_applications_count: number
  deleted_at: string | null
  updated_at: string
}

export interface TaskSearchHit {
  taskId: string
  score: number
}
