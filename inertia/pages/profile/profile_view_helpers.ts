import type { SpiderChartPoint } from './types.svelte'
import { getProfileGroupStyle } from './profile_theme'

export interface NormalizedProfileSkill {
  id: string
  skill_id: string
  skill_name: string
  category_code: string
  level_code: string | null
  avg_percentage: number | null
  total_reviews: number
}

export interface GroupedProfileSkills {
  code: string
  title: string
  badgeClass: string
  dotClass: string
  textClass: string
  items: Array<
    | NormalizedProfileSkill
    | {
        id: string
        skill_name: string
        level_code: string | null
        total_reviews: number
      }
  >
}

const PROFILE_SKILL_GROUP_ORDER = ['technical', 'soft_skill', 'delivery']

function toPlainString(value: unknown): string {
  return typeof value === 'string' ? value : ''
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
    avg_percentage:
      (relation.avg_percentage as number | null | undefined) ??
      (relation.avgPercentage as number | null | undefined) ??
      null,
    total_reviews:
      (relation.total_reviews as number | undefined) ??
      (relation.totalReviews as number | undefined) ??
      0,
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
      return {
        id: point.skill_id,
        skill_name: point.skill_name,
        level_code:
          point.level_code ??
          (pointData.level_code as string | undefined) ??
          (pointData.levelCode as string | undefined) ??
          null,
        total_reviews: point.total_reviews,
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
