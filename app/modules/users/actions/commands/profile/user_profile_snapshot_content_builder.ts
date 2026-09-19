import { DateTime } from 'luxon'

import {
  buildProfileSnapshotSlug,
  pickTopFrequencyKeys,
} from '#modules/users/domain/profile/profile_snapshot_rules'
import type {
  UserDomainExpertiseRecord,
  UserPerformanceStatRecord,
  UserProfileSnapshotRecord,
  UserRecord,
  UserSkillRecord,
  UserWorkHistoryRecord,
} from '#modules/users/types/user_records'

export interface PublishUserProfileSnapshotDTO {
  snapshotName?: string
  isPublic?: boolean
  expiresInDays?: number | null
}

export interface LoadedSnapshotReadModel {
  user: UserRecord
  skills: UserSkillRecord[]
  performanceStatsRow: UserPerformanceStatRecord | null
  domainExpertiseRow: UserDomainExpertiseRecord | null
  latestHighlights: UserWorkHistoryRecord[]
}

export interface LoadedSnapshotInputs {
  lastSnapshot: UserProfileSnapshotRecord | null
  readModel: LoadedSnapshotReadModel
}

export interface SnapshotSummary extends Record<string, unknown> {
  user_id: string
  username: string
  total_verified_skills: number
  total_tasks_completed: number
  trust_score: number
  trust_tier: string | null
  performance_score: number
  generated_at: string | null
}

export interface SnapshotPerformanceMetrics extends Record<string, unknown> {
  period_start: string | null
  period_end: string | null
  total_tasks_completed: number
  total_hours_worked: number
  avg_quality_score: number | null
  on_time_delivery_rate: number | null
  avg_days_early_or_late: number | null
  performance_score: number | null
  tasks_by_type: Record<string, number>
  tasks_by_domain: Record<string, number>
  tasks_by_difficulty: Record<string, number>
  tasks_as_lead: number
  tasks_as_sole_contributor: number
  tasks_mentoring_others: number
  longest_on_time_streak: number
  current_on_time_streak: number
  self_assessment_accuracy: number | null
  trust_data: unknown
}

export interface SnapshotDomainExpertiseSummary extends Record<string, unknown> {
  tech_stack_frequency: Record<string, number>
  domain_frequency: Record<string, number>
  problem_category_frequency: Record<string, number>
  top_skills: Record<string, unknown>[]
}

export interface SnapshotTrustMetrics extends Record<string, unknown> {
  trust_data: unknown
  domain_expertise: SnapshotDomainExpertiseSummary
  tech_stack: string[]
}

export interface SnapshotVerifiedSkill extends Record<string, unknown> {
  skill_id: string
  skill_name: string
  verified_public_proficiency_code: string
  total_reviews: number
  avg_percentage: number | null
  avg_score: number | null
  last_reviewed_at: string | null
}

export interface SnapshotWorkHighlight extends Record<string, unknown> {
  task_assignment_id: string
  task_id: string
  task_title: string
  task_type: string | null
  business_domain: string | null
  problem_category: string | null
  role_in_task: string | null
  collaboration_type: string | null
  difficulty: string | null
  overall_quality_score: number | null
  was_on_time: boolean | null
  completed_at: string | null
  verification: {
    status: 'review_confirmed' | 'retrospective'
    confidence: 'high' | 'limited'
  }
}

export interface BuiltSnapshotContent {
  nextVersion: number
  isPublic: boolean
  shareableSlug: string | null
  shareableToken: string | null
  summary: SnapshotSummary
  performanceMetrics: SnapshotPerformanceMetrics
  trustMetrics: SnapshotTrustMetrics
  verifiedSkills: SnapshotVerifiedSkill[]
  workHighlights: SnapshotWorkHighlight[]
}

type VerifiedSkillSource = UserSkillRecord & {
  skill: {
    skill_name: string
    category_code: string
  }
}

export function buildVerifiedSkills(
  skills: LoadedSnapshotReadModel['skills']
): SnapshotVerifiedSkill[] {
  return skills
    .filter((skill): skill is VerifiedSkillSource => skill.total_reviews > 0 && !!skill.skill)
    .map((skill) => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill.skill_name,
      verified_public_proficiency_code: skill.verified_public_proficiency_code,
      total_reviews: skill.total_reviews,
      avg_percentage: skill.avg_percentage,
      avg_score: skill.avg_score,
      last_reviewed_at: skill.last_reviewed_at?.toISO() ?? null,
    }))
}

export function buildPerformanceMetrics(
  user: UserRecord,
  performanceStatsRow: LoadedSnapshotReadModel['performanceStatsRow']
): SnapshotPerformanceMetrics {
  return {
    period_start: performanceStatsRow?.period_start?.toISO() ?? null,
    period_end: performanceStatsRow?.period_end?.toISO() ?? null,
    total_tasks_completed: performanceStatsRow?.total_tasks_completed ?? 0,
    total_hours_worked: performanceStatsRow?.total_hours_worked ?? 0,
    avg_quality_score: performanceStatsRow?.avg_quality_score ?? null,
    on_time_delivery_rate: performanceStatsRow?.on_time_delivery_rate ?? null,
    avg_days_early_or_late: performanceStatsRow?.avg_days_early_or_late ?? null,
    performance_score:
      performanceStatsRow?.performance_score ?? user.trust_data?.performance_score ?? null,
    tasks_by_type: performanceStatsRow?.tasks_by_type ?? {},
    tasks_by_domain: performanceStatsRow?.tasks_by_domain ?? {},
    tasks_by_difficulty: performanceStatsRow?.tasks_by_difficulty ?? {},
    tasks_as_lead: performanceStatsRow?.tasks_as_lead ?? 0,
    tasks_as_sole_contributor: performanceStatsRow?.tasks_as_sole_contributor ?? 0,
    tasks_mentoring_others: performanceStatsRow?.tasks_mentoring_others ?? 0,
    longest_on_time_streak: performanceStatsRow?.longest_on_time_streak ?? 0,
    current_on_time_streak: performanceStatsRow?.current_on_time_streak ?? 0,
    self_assessment_accuracy: performanceStatsRow?.self_assessment_accuracy ?? null,
    trust_data: user.trust_data ?? null,
  }
}

export function buildDomainExpertiseSummary(
  domainExpertiseRow: LoadedSnapshotReadModel['domainExpertiseRow']
): SnapshotDomainExpertiseSummary {
  return {
    tech_stack_frequency: domainExpertiseRow?.tech_stack_frequency ?? {},
    domain_frequency: domainExpertiseRow?.domain_frequency ?? {},
    problem_category_frequency: domainExpertiseRow?.problem_category_frequency ?? {},
    top_skills: domainExpertiseRow?.top_skills ?? [],
  }
}

export function buildTrustMetrics(
  user: UserRecord,
  domainExpertiseSummary: SnapshotDomainExpertiseSummary
): SnapshotTrustMetrics {
  return {
    trust_data: user.trust_data ?? null,
    domain_expertise: domainExpertiseSummary,
    tech_stack: pickTopFrequencyKeys(domainExpertiseSummary.tech_stack_frequency, 10),
  }
}

export function buildWorkHighlights(
  latestHighlights: LoadedSnapshotReadModel['latestHighlights']
): SnapshotWorkHighlight[] {
  return latestHighlights.map((item) => ({
    task_assignment_id: item.task_assignment_id,
    task_id: item.task_id,
    task_title: item.task_title,
    task_type: item.task_type,
    business_domain: item.business_domain,
    problem_category: item.problem_category,
    role_in_task: item.role_in_task,
    collaboration_type: item.collaboration_type,
    difficulty: item.difficulty,
    overall_quality_score: item.overall_quality_score,
    was_on_time: item.was_on_time,
    completed_at: item.completed_at?.toISO() ?? null,
    verification: {
      status: 'retrospective',
      confidence: 'limited',
    },
  }))
}

export function buildSummary(
  userId: string,
  user: UserRecord,
  totalVerifiedSkills: number,
  inputs: LoadedSnapshotInputs,
  workHighlights: SnapshotWorkHighlight[]
): SnapshotSummary {
  return {
    user_id: userId,
    username: user.username,
    total_verified_skills: totalVerifiedSkills,
    total_tasks_completed:
      inputs.readModel.performanceStatsRow?.total_tasks_completed ?? workHighlights.length,
    trust_score: user.trust_data?.calculated_score ?? 0,
    trust_tier: user.trust_data?.current_tier_code ?? null,
    performance_score:
      inputs.readModel.performanceStatsRow?.performance_score ??
      user.trust_data?.performance_score ??
      0,
    generated_at: DateTime.now().toISO(),
  }
}

export function buildUserProfileSnapshotContent(params: {
  userId: string
  dto: PublishUserProfileSnapshotDTO
  inputs: LoadedSnapshotInputs
  createToken: (length: number) => string
}): BuiltSnapshotContent {
  const { userId, dto, inputs, createToken } = params
  const nextVersion = (inputs.lastSnapshot?.version ?? 0) + 1
  const verifiedSkills = buildVerifiedSkills(inputs.readModel.skills)
  const performanceMetrics = buildPerformanceMetrics(
    inputs.readModel.user,
    inputs.readModel.performanceStatsRow
  )
  const domainExpertiseSummary = buildDomainExpertiseSummary(
    inputs.readModel.domainExpertiseRow
  )
  const workHighlights = buildWorkHighlights(inputs.readModel.latestHighlights)
  const isPublic = dto.isPublic ?? true

  return {
    nextVersion,
    isPublic,
    shareableSlug: isPublic
      ? buildProfileSnapshotSlug({
          username: inputs.readModel.user.username,
          userId,
          version: nextVersion,
          suffix: Date.now().toString(36),
        })
      : null,
    shareableToken: isPublic ? createToken(16) : null,
    summary: buildSummary(
      userId,
      inputs.readModel.user,
      verifiedSkills.length,
      inputs,
      workHighlights
    ),
    performanceMetrics,
    trustMetrics: buildTrustMetrics(inputs.readModel.user, domainExpertiseSummary),
    verifiedSkills,
    workHighlights,
  }
}
