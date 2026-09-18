import type { TaskRequirementProjection } from '#modules/tasks/actions/dtos/response/task_requirement_projection'
import { calculateApplicantMatch } from '#modules/tasks/public_contracts/applicant_match'

export interface UserSkillSummary {
  skill_id: string
  verified_public_proficiency_code: string
  source: 'imported' | 'reviewed'
}

export interface UserWorkHistorySummary {
  business_domain: string | null
  problem_category: string | null
  task_type: string | null
  was_on_time: boolean | null
}

export interface ScoredTaskParams {
  task: {
    id: string
    task_type: string
    business_domain?: string | null
    problem_category?: string | null
    task_visibility: string
    acceptance_criteria?: unknown
    verification_method?: unknown
    context_background?: unknown
    created_at: unknown
  }
  requiredSkills: TaskRequirementProjection[]
  currentUserSkills: UserSkillSummary[]
  workHistory: UserWorkHistorySummary[]
  trustScore: number
  hasApplication: boolean
  userId?: string | null
}

export interface ScoredTaskResult {
  priorityScore: number
  recommendationReasons: string[]
  evidenceWarnings: string[]
  recommendationRisks: string[]
  evidenceConfidence: 'low' | 'medium' | 'high' | null
  skillMatch: number | null
  domainMatch: number | null
}

export function calculateTaskRecommendationScore(params: ScoredTaskParams): ScoredTaskResult {
  const {
    task,
    requiredSkills,
    currentUserSkills,
    workHistory,
    trustScore,
    hasApplication,
    userId,
  } = params

  const currentUserSkillIds = new Set(currentUserSkills.map((skill) => skill.skill_id))
  const matchedSkills = requiredSkills.filter((skill) =>
    currentUserSkillIds.has(skill.skill_id)
  ).length
  const matchedMandatorySkills = requiredSkills.filter(
    (skill) => skill.is_mandatory && currentUserSkillIds.has(skill.skill_id)
  ).length
  const visibilityBoost = task.task_visibility === 'all' ? 2 : 1
  const contextBoost =
    Number(Boolean(task.acceptance_criteria)) +
    Number(Boolean(task.verification_method)) +
    Number(Boolean(task.context_background))

  const profileMatch = userId
    ? calculateApplicantMatch(
        {
          requiredSkills: requiredSkills.map((skill) => ({
            skill_id: skill.skill_id,
            required_public_proficiency_code: skill.required_public_proficiency_code,
            is_mandatory: skill.is_mandatory,
            skill_name: skill.skill.skill_name,
            minimumLevelId: skill.minimum_level_id,
            targetLevelId: skill.target_level_id,
            assessmentCeilingLevelId: skill.assessment_ceiling_level_id,
            importance: skill.importance,
            weight: skill.weight,
            projectSkillId: skill.project_skill_id,
            rubricVersionId: skill.rubric_version_id,
          })),
          business_domain: task.business_domain ?? null,
          problem_category: task.problem_category ?? null,
          task_type: task.task_type,
        },
        {
          skills: currentUserSkills,
          workHistory,
          trustScore,
        }
      )
    : null

  const priorityScore =
    (profileMatch?.match_score ?? 0) +
    matchedSkills * 10 +
    matchedMandatorySkills * 15 +
    visibilityBoost * 2 +
    contextBoost -
    (hasApplication ? 20 : 0)

  return {
    priorityScore,
    recommendationReasons: profileMatch?.explanations.slice(0, 3) ?? [],
    evidenceWarnings: profileMatch?.evidence_warnings.slice(0, 3) ?? [],
    recommendationRisks: profileMatch?.risks.slice(0, 3) ?? [],
    evidenceConfidence: profileMatch?.evidence_confidence ?? null,
    skillMatch: profileMatch?.skill_match ?? null,
    domainMatch: profileMatch?.domain_match ?? null,
  }
}
