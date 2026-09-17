import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { isCanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { isSkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'

export interface RequiredSkillInput {
  id: string
  level?: string
  custom_name?: string
  category_code?: string | null
  // Semantic fields
  project_skill_id?: string
  source_project_professional_role_id?: string
  source_role_skill_id?: string
  minimum_level_id?: string
  target_level_id?: string
  assessment_ceiling_level_id?: string
  rubric_version_id?: string
  importance?: string
  weight?: number
  requirement_source?: string
  requirement_notes?: string
  is_mandatory?: boolean
}

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeRequiredSkills(
  requiredSkills: RequiredSkillInput[] | undefined,
  allowIncompleteDraft: boolean
): RequiredSkillInput[] {
  const normalizedRequiredSkills = requiredSkills ?? []

  if (!Array.isArray(normalizedRequiredSkills)) {
    throw new ValidationException('Danh sách kỹ năng yêu cầu không hợp lệ')
  }

  if (!allowIncompleteDraft && normalizedRequiredSkills.length === 0) {
    throw new ValidationException('Task phải có ít nhất 1 kỹ năng yêu cầu')
  }

  const seenSkillIds = new Set<string>()

  return normalizedRequiredSkills.map((skill) => {
    const skillId = skill.id.trim()
    const customName = skill.custom_name?.trim().replace(/\s+/g, ' ')
    const categoryCode = skill.category_code?.trim() || null
    if (!skillId) {
      throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
    }

    if (!customName && !UUID_REGEX.test(skillId)) {
      throw new ValidationException('ID kỹ năng yêu cầu không hợp lệ')
    }

    let dedupeKey: string
    if (customName) {
      if (!isSkillCategoryCode(categoryCode)) {
        throw new ValidationException('Nhóm kỹ năng custom không hợp lệ')
      }
      dedupeKey = `custom:${categoryCode}:${customName.toLowerCase()}`
    } else {
      dedupeKey = `id:${skillId}`
    }

    if (seenSkillIds.has(dedupeKey)) {
      throw new ValidationException('Kỹ năng yêu cầu bị trùng lặp')
    }

    seenSkillIds.add(dedupeKey)

    // Application boundary only accepts canonical public proficiency codes.
    if (skill.level !== undefined) {
      const level = skill.level.trim().toLowerCase()
      if (!isCanonicalProficiencyLevelCode(level)) {
        throw new ValidationException(`Cấp độ kỹ năng không hợp lệ: ${level}`)
      }
    }

    // Validate weight if provided
    if (skill.weight !== undefined && skill.weight < 0) {
      throw new ValidationException('Weight không được âm')
    }

    return omitUndefined({
      id: skillId,
      level: skill.level?.trim().toLowerCase(),
      custom_name: customName,
      category_code: categoryCode,
      project_skill_id: skill.project_skill_id,
      source_project_professional_role_id: skill.source_project_professional_role_id,
      source_role_skill_id: skill.source_role_skill_id,
      minimum_level_id: skill.minimum_level_id,
      target_level_id: skill.target_level_id,
      assessment_ceiling_level_id: skill.assessment_ceiling_level_id,
      rubric_version_id: skill.rubric_version_id,
      importance: skill.importance,
      weight: skill.weight,
      requirement_source: skill.requirement_source,
      requirement_notes: skill.requirement_notes,
      is_mandatory: skill.is_mandatory,
    })
  })
}
