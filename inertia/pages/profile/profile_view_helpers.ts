import { getProfileGroupStyle } from './profile_theme'
import type { SpiderChartPoint } from './types.svelte'

export interface NormalizedProfileSkill {
  id: string
  skill_id: string
  skill_name: string
  category_code: string
  level_code: string | null
  avg_percentage: number | null
  total_reviews: number
  source?: string | null
}

export interface GroupedProfileSkills {
  code: string
  title: string
  badgeClass: string
  dotClass: string
  textClass: string
  items: (| NormalizedProfileSkill
    | {
        id: string
        skill_name: string
        level_code: string | null
        total_reviews: number
      })[]
}

const PROFILE_SKILL_GROUP_ORDER = ['technical', 'soft_skill', 'delivery']

function toPlainString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

export interface ProfileSettingsSummary {
  custom_headline: string | null
  preferred_job_types: string[]
  preferred_locations: string[]
  min_salary_expectation: number | null
  salary_currency: string | null
  available_from: string | null
  is_searchable: boolean | null
  show_contact_info: boolean | null
  show_organizations: boolean | null
  show_projects: boolean | null
  show_spider_chart: boolean | null
  show_technical_skills: boolean | null
}

export interface TrustMetricsSummary {
  calculated_score: number | null
  current_tier_code: string | null
  total_verified_reviews: number | null
  raw_score: number | null
  performance_score: number | null
}

export interface CredibilityMetricsSummary {
  credibility_score: number | null
  total_reviews_given: number | null
  accurate_reviews: number | null
  disputed_reviews: number | null
}

export interface SnapshotSummaryInsights {
  trust_score: number | null
  trust_tier: string | null
  total_tasks_completed: number | null
  total_verified_skills: number | null
  performance_score: number | null
  avg_quality_score: number | null
  on_time_delivery_rate: number | null
}

export function normalizeProfileSkillRelation(value: unknown): NormalizedProfileSkill {
  const relation = value as Record<string, unknown>
  const skill = (relation.skill as Record<string, unknown> | undefined) ?? {}

  return {
    id: toPlainString(relation.id),
    skill_id: toPlainString(relation.skill_id),
    skill_name:
      (skill.skill_name as string | undefined) ??
      (skill.skillName as string | undefined) ??
      (relation.skill_name as string | undefined) ??
      'Kỹ năng chưa đặt tên',
    category_code:
      (skill.category_code as string | undefined) ??
      (skill.categoryCode as string | undefined) ??
      (relation.category_code as string | undefined) ??
      'other',
    level_code:
      (relation.level_code as string | undefined) ??
      (relation.levelCode as string | undefined) ??
      null,
    avg_percentage: toNullableNumber(relation.avg_percentage ?? relation.avgPercentage),
    total_reviews: toNullableNumber(relation.total_reviews ?? relation.totalReviews) ?? 0,
    source:
      (relation.source as string | undefined) ??
      (relation.skill_source as string | undefined) ??
      (relation.skillSource as string | undefined) ??
      null,
  }
}

export function buildGroupedSkillsByCategory(
  skills: NormalizedProfileSkill[]
): GroupedProfileSkills[] {
  const groups = new Map<string, NormalizedProfileSkill[]>()
  for (const skill of skills) {
    const key = skill.category_code || 'other'
    const bucket = groups.get(key)
    if (bucket) {
      bucket.push(skill)
    } else {
      groups.set(key, [skill])
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const aIndex = PROFILE_SKILL_GROUP_ORDER.indexOf(a)
      const bIndex = PROFILE_SKILL_GROUP_ORDER.indexOf(b)
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    })
    .map(([code, items]) => {
      const style = getProfileGroupStyle(code)
      return {
        code,
        title: style.title,
        badgeClass: style.badgeClass,
        dotClass: style.dotClass,
        textClass: style.textClass,
        items,
      }
    })
}

export function createGroupedSkillsFromSpiderData(
  categoryCode: 'technical' | 'soft_skill' | 'delivery',
  points: SpiderChartPoint[]
): GroupedProfileSkills {
  const style = getProfileGroupStyle(categoryCode)

  return {
    code: categoryCode,
    title: style.title,
    badgeClass: style.badgeClass,
    dotClass: style.dotClass,
    textClass: style.textClass,
    items: points.map((point) => {
      const pointData = point as unknown as Record<string, unknown>
      const avgPercentageRaw = pointData.avg_percentage ?? pointData.avgPercentage
      const totalReviewsRaw = pointData.total_reviews ?? pointData.totalReviews
      const totalReviews = toNullableNumber(totalReviewsRaw) ?? 0

      return {
        id: point.skill_id,
        skill_id: point.skill_id,
        skill_name: point.skill_name,
        category_code: categoryCode,
        level_code:
          point.level_code ??
          (pointData.level_code as string | undefined) ??
          (pointData.levelCode as string | undefined) ??
          null,
        avg_percentage: toNullableNumber(avgPercentageRaw),
        total_reviews: totalReviews,
        source: totalReviews > 0 ? 'reviewed' : 'imported',
      }
    }),
  }
}

export function getUserInitials(username: string): string {
  return username
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('')
}

export function getUserNumberField(user: Record<string, unknown>, key: string): number | undefined {
  const value = user[key]
  return typeof value === 'number' ? value : undefined
}

export function getUserStringField(user: Record<string, unknown>, key: string): string | undefined {
  const value = user[key]
  return typeof value === 'string' ? value : undefined
}

export function readProfileSettings(user: Record<string, unknown>): ProfileSettingsSummary {
  const settings = toRecord(user.profile_settings ?? user.profileSettings)
  const preferredJobTypes = Array.isArray(settings.preferred_job_types)
    ? settings.preferred_job_types.filter((value): value is string => typeof value === 'string')
    : []
  const preferredLocations = Array.isArray(settings.preferred_locations)
    ? settings.preferred_locations.filter((value): value is string => typeof value === 'string')
    : []

  return {
    custom_headline: toNullableString(settings.custom_headline),
    preferred_job_types: preferredJobTypes,
    preferred_locations: preferredLocations,
    min_salary_expectation: toNullableNumber(settings.min_salary_expectation),
    salary_currency: toNullableString(settings.salary_currency),
    available_from: toNullableString(settings.available_from),
    is_searchable:
      typeof settings.is_searchable === 'boolean' ? settings.is_searchable : null,
    show_contact_info:
      typeof settings.show_contact_info === 'boolean' ? settings.show_contact_info : null,
    show_organizations:
      typeof settings.show_organizations === 'boolean' ? settings.show_organizations : null,
    show_projects: typeof settings.show_projects === 'boolean' ? settings.show_projects : null,
    show_spider_chart:
      typeof settings.show_spider_chart === 'boolean' ? settings.show_spider_chart : null,
    show_technical_skills:
      typeof settings.show_technical_skills === 'boolean'
        ? settings.show_technical_skills
        : null,
  }
}

export function readTrustMetrics(user: Record<string, unknown>): TrustMetricsSummary {
  const trustData = toRecord(user.trust_data ?? user.trustData)

  return {
    calculated_score:
      toNullableNumber(user.trust_score) ?? toNullableNumber(trustData.calculated_score),
    current_tier_code:
      toNullableString(user.trust_tier_code) ?? toNullableString(trustData.current_tier_code),
    total_verified_reviews: toNullableNumber(trustData.total_verified_reviews),
    raw_score: toNullableNumber(trustData.raw_score),
    performance_score: toNullableNumber(trustData.performance_score),
  }
}

export function readCredibilityMetrics(
  user: Record<string, unknown>
): CredibilityMetricsSummary {
  const credibilityData = toRecord(user.credibility_data ?? user.credibilityData)

  return {
    credibility_score:
      toNullableNumber(user.credibility_score) ??
      toNullableNumber(credibilityData.credibility_score),
    total_reviews_given: toNullableNumber(credibilityData.total_reviews_given),
    accurate_reviews: toNullableNumber(credibilityData.accurate_reviews),
    disputed_reviews: toNullableNumber(credibilityData.disputed_reviews),
  }
}

export function readSnapshotInsights(snapshot: unknown): SnapshotSummaryInsights {
  const source = toRecord(snapshot)
  const summary = toRecord(source.summary)
  const performance = toRecord(source.performance_metrics)

  return {
    trust_score: toNullableNumber(summary.trust_score),
    trust_tier: toNullableString(summary.trust_tier),
    total_tasks_completed: toNullableNumber(summary.total_tasks_completed),
    total_verified_skills: toNullableNumber(summary.total_verified_skills),
    performance_score: toNullableNumber(performance.performance_score),
    avg_quality_score: toNullableNumber(performance.avg_quality_score),
    on_time_delivery_rate: toNullableNumber(performance.on_time_delivery_rate),
  }
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  return `${value.toFixed(digits)}%`
}

export function formatCompactNumber(value: number | null | undefined, digits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--'
  }

  return new Intl.NumberFormat('vi-VN', {
    notation: Math.abs(value) >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatMoney(
  value: number | null | undefined,
  currency = 'VND'
): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${formatCompactNumber(value, 0)} ${currency}`
  }
}
