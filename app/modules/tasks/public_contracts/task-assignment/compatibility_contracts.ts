import type { TvaIsoTimestamp, TvaJsonObject, TvaUuid } from '#modules/tasks/public_contracts/task-authoring/primitives'

/**
 * Exact compatibility shape currently published by Tasks as CompletedAssignmentProfileFactV1.
 * This remains requirement/history input and is not a verified accomplishment or completion claim.
 */
export interface CurrentCompletedAssignmentProfileFactV1 {
  readonly contractVersion: 1
  readonly taskAssignmentId: TvaUuid
  readonly taskId: TvaUuid
  readonly organizationId: TvaUuid
  readonly projectId: TvaUuid | null
  readonly taskTitle: string
  readonly taskType: string | null
  readonly businessDomain: string | null
  readonly problemCategory: string | null
  readonly roleInTask: string | null
  readonly autonomyLevel: string | null
  readonly collaborationType: string | null
  readonly techStack: readonly string[]
  readonly domainTags: readonly string[]
  readonly difficulty: string | null
  readonly estimatedTime: number | null
  readonly actualTime: number | null
  readonly assignmentEstimatedHours: number | null
  readonly assignmentActualHours: number | null
  readonly dueDate: TvaIsoTimestamp | null
  readonly completedAt: TvaIsoTimestamp | null
  readonly measurableOutcomes: readonly TvaJsonObject[]
  readonly impactScope: string | null
}

/**
 * Serialized compatibility view of the existing user_work_history row. Lucid DateTime values must
 * be converted to ISO timestamps at the adapter boundary before this contract is evaluated.
 */
export interface LegacyUserWorkHistoryRowV1 {
  readonly id: TvaUuid
  readonly user_id: TvaUuid
  readonly task_id: TvaUuid
  readonly task_assignment_id: TvaUuid
  readonly organization_id: TvaUuid | null
  readonly project_id: TvaUuid | null
  readonly task_title: string
  readonly task_type: string | null
  readonly business_domain: string | null
  readonly problem_category: string | null
  readonly role_in_task: string | null
  readonly autonomy_level: string | null
  readonly collaboration_type: string | null
  readonly tech_stack: readonly string[]
  readonly domain_tags: readonly string[]
  readonly difficulty: string | null
  readonly estimated_hours: number | null
  readonly actual_hours: number | null
  readonly was_on_time: boolean | null
  readonly days_early_or_late: number | null
  readonly measurable_outcomes: readonly TvaJsonObject[]
  readonly estimated_business_value: string | null
  readonly knowledge_artifacts: readonly TvaJsonObject[]
  readonly overall_quality_score: number | null
  readonly skill_scores: readonly TvaJsonObject[]
  readonly evidence_links: readonly TvaJsonObject[]
  readonly is_featured: boolean
  readonly is_public: boolean
  readonly completed_at: TvaIsoTimestamp | null
  readonly created_at: TvaIsoTimestamp
  readonly updated_at: TvaIsoTimestamp
}
