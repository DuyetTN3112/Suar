import axios from 'axios'

export interface Skill {
  id: string
  skillName: string
  categoryCode?: string
  aliases?: string[]
}

export interface ProjectSkill {
  id: string
  skill: Skill
  displayNameOverride: string | null
  descriptionOverride: string | null
  rubricVersionId: string | null
  minimumTaskRequirementLevelId: string | null
  maximumTaskRequirementLevelId: string | null
  isActive: boolean
}

export interface RubricVersion {
  id: string
  version: number
  status: 'draft' | 'published'
  effective_to: string | null
}

export interface ProficiencyLevel {
  id: string
  ordinal: number
  code: string
  displayName: string
}

export interface ProjectSkillsTabProps {
  projectId: string
  canEdit: boolean
}

export interface ApiErrorResponse {
  message?: string
}

export type ProjectSkillCategoryFilter = 'all' | 'technology' | 'engineering' | 'soft_skill' | 'delivery'

export const categoryFilters: ProjectSkillCategoryFilter[] = [
  'all',
  'technology',
  'engineering',
  'soft_skill',
  'delivery',
]

export const categoryLabelFallbacks: Record<ProjectSkillCategoryFilter, string> = {
  all: 'All',
  technology: 'Technology',
  engineering: 'Software engineering',
  soft_skill: 'Soft skills',
  delivery: 'Delivery',
}

export const statusLabelFallbacks: Record<'all' | 'active' | 'inactive', string> = {
  active: 'Active only',
  inactive: 'Inactive only',
  all: 'All statuses',
}

export const categoryColors: Record<string, string> = {
  technology: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  engineering: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30',
  soft_skill: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  delivery: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
}

export function isCategoryFilter(category: string): category is ProjectSkillCategoryFilter {
  return categoryFilters.includes(category as ProjectSkillCategoryFilter)
}

export function isValidRange(
  minimumLevelId: string,
  maximumLevelId: string,
  proficiencyLevels: ProficiencyLevel[]
): boolean {
  const minimum = proficiencyLevels.find((level) => level.id === minimumLevelId)
  const maximum = proficiencyLevels.find((level) => level.id === maximumLevelId)
  return Boolean(minimum && maximum && minimum.ordinal <= maximum.ordinal)
}

export function levelLabel(levelId: string | null, proficiencyLevels: ProficiencyLevel[]): string {
  const level = proficiencyLevels.find((item) => item.id === levelId)
  return level ? level.code.toUpperCase() : 'Chưa cấu hình'
}

export function levelRangeLabel(
  projectSkill: ProjectSkill,
  proficiencyLevels: ProficiencyLevel[]
): string {
  if (
    !projectSkill.minimumTaskRequirementLevelId ||
    !projectSkill.maximumTaskRequirementLevelId
  ) {
    return 'Chưa cấu hình'
  }
  return `${levelLabel(projectSkill.minimumTaskRequirementLevelId, proficiencyLevels)}–${levelLabel(projectSkill.maximumTaskRequirementLevelId, proficiencyLevels)}`
}

export function rubricLabel(projectSkill: ProjectSkill): string {
  return projectSkill.rubricVersionId ? 'Đã gắn' : 'Chưa gắn'
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response ? (error.response.data.message ?? fallback) : fallback
  }

  return fallback
}
