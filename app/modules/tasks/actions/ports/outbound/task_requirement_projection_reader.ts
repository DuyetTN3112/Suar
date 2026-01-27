export interface TaskRequirementProjectionSource {
  id: string
  task_id: string
  skill_id: string
  project_skill_id: string | null
  source_project_professional_role_id: string | null
  source_role_skill_id: string | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string
  proficiency_level_id: string | null
  is_mandatory: boolean
  importance: 'low' | 'medium' | 'high' | 'critical'
  weight: number | string
  requirement_source:
    | 'manual'
    | 'professional_role_prefill'
    | 'template'
    | 'copied_task'
    | 'imported_legacy'
  requirement_notes: string | null
  created_at: { toISO(): string | null } | Date | string | null
}

/**
 * Consumer-owned persistence port for the task requirement read projection.
 */
export abstract class TaskRequirementProjectionReader {
  abstract findByTask(taskId: string): Promise<TaskRequirementProjectionSource[]>
}
