import {
  CUSTOM_SKILL_CATALOG_SOURCES,
  type CustomSkillCatalogSource,
} from '#modules/skills/public_contracts/custom_skill_catalog'

const MAX_SKILL_CODE_LENGTH = 50
const SKILL_CODE_FINGERPRINT_LENGTH = 16

const DESCRIPTION_SUFFIX_BY_SOURCE: Record<CustomSkillCatalogSource, string> = {
  [CUSTOM_SKILL_CATALOG_SOURCES.USER_PROFILE]: ' - user-declared profile skill',
  [CUSTOM_SKILL_CATALOG_SOURCES.TASK_REQUIREMENT]: ' - custom task requirement skill',
}

const RECOGNIZED_HISTORICAL_DESCRIPTION_SUFFIXES = new Set(
  Object.values(DESCRIPTION_SUFFIX_BY_SOURCE)
)

export function normalizeCustomSkillName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function buildCustomSkillCode(skillName: string, digest: (value: string) => string): string {
  const canonicalName = skillName.normalize('NFKC').toLowerCase()
  const decomposedName = canonicalName.normalize('NFKD')
  const losesDiacritics = /[\u0300-\u036f]/.test(decomposedName)
  const normalizedForSlug = decomposedName.replace(/[\u0300-\u036f]/g, '')
  const slug = normalizedForSlug.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const fingerprint = digest(canonicalName).slice(0, SKILL_CODE_FINGERPRINT_LENGTH)
  const losesMeaningfulCharacters =
    losesDiacritics ||
    /[^a-z0-9\s_-]/.test(normalizedForSlug) ||
    slug.length > MAX_SKILL_CODE_LENGTH

  if (slug.length === 0) {
    return `custom_skill_${fingerprint}`
  }
  if (!losesMeaningfulCharacters) {
    return slug
  }

  const fingerprintSlugLength = MAX_SKILL_CODE_LENGTH - SKILL_CODE_FINGERPRINT_LENGTH - 1
  return `${slug.slice(0, fingerprintSlugLength)}_${fingerprint}`
}

export function isHistoricalCustomSkillDescription(description: string | null): boolean {
  return [...RECOGNIZED_HISTORICAL_DESCRIPTION_SUFFIXES].some((suffix) =>
    description?.endsWith(suffix)
  )
}

export function customSkillDescriptionSuffix(source: CustomSkillCatalogSource): string {
  return DESCRIPTION_SUFFIX_BY_SOURCE[source]
}
