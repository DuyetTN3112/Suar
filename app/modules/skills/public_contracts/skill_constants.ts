export const SKILL_IMPORTANCE_VALUES = ['low', 'medium', 'high', 'critical'] as const
export type SkillImportance = (typeof SKILL_IMPORTANCE_VALUES)[number]
export const DEFAULT_SKILL_IMPORTANCE: SkillImportance = 'medium'

export const SKILL_RUBRIC_VERSION_STATUSES = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const
export type SkillRubricVersionStatus =
  (typeof SKILL_RUBRIC_VERSION_STATUSES)[keyof typeof SKILL_RUBRIC_VERSION_STATUSES]

export const SKILL_DISPLAY_TYPES = {
  SPIDER_CHART: 'spider_chart',
  LIST: 'list',
} as const
export type SkillDisplayType = (typeof SKILL_DISPLAY_TYPES)[keyof typeof SKILL_DISPLAY_TYPES]

export enum SkillCategoryCode {
  TECHNOLOGY = 'technology',
  ENGINEERING = 'engineering',
  SOFT_SKILL = 'soft_skill',
  DELIVERY = 'delivery',
}

export const SKILL_CATEGORY_ORDER = [
  SkillCategoryCode.TECHNOLOGY,
  SkillCategoryCode.ENGINEERING,
  SkillCategoryCode.SOFT_SKILL,
  SkillCategoryCode.DELIVERY,
] as const

export const SKILL_CATEGORY_CODES = [...SKILL_CATEGORY_ORDER] as const
export type SkillCategoryCodeValue = (typeof SKILL_CATEGORY_ORDER)[number]

export const SKILL_CATEGORY_LABELS: Record<
  SkillCategoryCodeValue,
  { label: string; labelVi: string }
> = {
  [SkillCategoryCode.TECHNOLOGY]: { label: 'Technology', labelVi: 'Công nghệ' },
  [SkillCategoryCode.ENGINEERING]: { label: 'Engineering', labelVi: 'Kỹ thuật phần mềm' },
  [SkillCategoryCode.SOFT_SKILL]: { label: 'Soft Skills', labelVi: 'Kỹ năng mềm' },
  [SkillCategoryCode.DELIVERY]: { label: 'Delivery', labelVi: 'Quản lý công việc' },
}

export const SKILL_CATEGORY_DISPLAY_CONFIG = {
  [SkillCategoryCode.TECHNOLOGY]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.TECHNOLOGY],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.ENGINEERING]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.ENGINEERING],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.SOFT_SKILL]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.SOFT_SKILL],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.DELIVERY]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.DELIVERY],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
} as const satisfies Record<
  SkillCategoryCodeValue,
  { label: string; labelVi: string; displayType: SkillDisplayType }
>

export const skillCategoryOptions = SKILL_CATEGORY_ORDER.map((value) => ({
  ...SKILL_CATEGORY_DISPLAY_CONFIG[value],
  value,
}))

export function isSkillCategoryCode(value: unknown): value is SkillCategoryCodeValue {
  return typeof value === 'string' && SKILL_CATEGORY_CODES.includes(value as SkillCategoryCodeValue)
}

export const DEFAULT_SKILL_WEIGHT = 1
