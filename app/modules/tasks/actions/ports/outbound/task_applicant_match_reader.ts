export interface TaskApplicantMatchTask {
  business_domain: string
  problem_category: string
  task_type: string
  project_id: string | null
  organization_id: string | null
  creator_id: string
  assigned_to: string | null
}

export interface TaskApplicantRequiredSkill {
  skill_id: string
  required_public_proficiency_code: string
  is_mandatory: boolean
  skill_name: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  importance: string | null
  weight: number | null
  project_skill_id: string | null
  rubric_version_id: string | null
}

export interface TaskApplicantSkill {
  skill_id: string
  verified_public_proficiency_code: string
  source: string
}

export interface TaskApplicantWorkHistory {
  business_domain: string
  problem_category: string
  task_type: string
  was_on_time: boolean
}

export interface TaskApplicantMatchCandidate {
  application_id: string
  applicant_id: string
  applicant_name: string
  trust_score: number
  skills: TaskApplicantSkill[]
  work_history: TaskApplicantWorkHistory[]
  is_project_member: boolean
  is_organization_member: boolean
}

export interface TaskApplicantMatchContext {
  task: TaskApplicantMatchTask | null
  required_skills: TaskApplicantRequiredSkill[]
  applicants: TaskApplicantMatchCandidate[]
}

export abstract class TaskApplicantMatchReader {
  abstract load(
    taskId: string,
    applicationId?: string
  ): Promise<TaskApplicantMatchContext>
}
