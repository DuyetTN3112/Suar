import {
  findBroadProficiencyBandDescriptor,
  findExactProficiencyLevelDescriptor,
  getRepresentativeCanonicalLevelCode,
  normalizeProficiencyLevelToken,
  type LegacyProficiencyBandCode,
  type LevelDimensions,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'

export type ProficiencyFrameworkDescriptor = {
  source: 'suar-kb-v5'
  matchType: 'exact_level' | 'broad_band' | 'unknown'
  careerBand: string | null
  canonicalLevelCode: string | null
  canonicalLevelName: string | null
  canonicalLevelNumber: number | null
  summary: string | null
  levelDimensions: LevelDimensions | null
  typicalSigns: string[]
  recommendedCanonicalLevels: Array<{
    code: string
    name: string
    number: number
  }>
}

export function isSupportedProficiencyLevelCode(value: string | null | undefined): boolean {
  const normalizedCode = normalizeProficiencyLevelToken(value)
  if (!normalizedCode) return false
  return Boolean(
    findExactProficiencyLevelDescriptor(normalizedCode) ??
    findBroadProficiencyBandDescriptor(normalizedCode)
  )
}

export function isCanonicalProficiencyLevelCode(value: string | null | undefined): boolean {
  const normalizedCode = normalizeProficiencyLevelToken(value)
  if (!normalizedCode) return false

  const exact = findExactProficiencyLevelDescriptor(normalizedCode)
  if (!exact) return false

  return normalizeProficiencyLevelToken(exact.canonicalLevelCode) === normalizedCode
}

export function toLegacyProficiencyBandCode(
  value: string | null | undefined,
  fallback: LegacyProficiencyBandCode = 'junior'
): LegacyProficiencyBandCode {
  const normalizedCode = normalizeProficiencyLevelToken(value)
  if (!normalizedCode) return fallback

  const exact = findExactProficiencyLevelDescriptor(normalizedCode)
  if (exact) {
    return exact.legacyBandCode
  }

  if (normalizedCode === 'mid') {
    return 'middle'
  }

  const broad = findBroadProficiencyBandDescriptor(normalizedCode)
  if (!broad) return fallback

  switch (broad.careerBand) {
    case 'Beginner':
      return normalizedCode === 'elementary' ? 'elementary' : 'beginner'
    case 'Junior':
      return 'junior'
    case 'Middle':
      return 'middle'
    case 'Senior':
      return 'senior'
    default:
      return fallback
  }
}

export function findMatchingProficiencyLevel<
  T extends {
    code: string
    display_name?: string | null
    short_name?: string | null
  },
>(levels: T[], rawCode: string | null | undefined): T | null {
  const normalizedCode = normalizeProficiencyLevelToken(rawCode)
  if (!normalizedCode) return null

  const directMatch = levels.find((level) => {
    return (
      normalizeProficiencyLevelToken(level.code) === normalizedCode ||
      normalizeProficiencyLevelToken(level.display_name) === normalizedCode ||
      normalizeProficiencyLevelToken(level.short_name) === normalizedCode
    )
  })

  if (directMatch) {
    return directMatch
  }

  const exact = findExactProficiencyLevelDescriptor(normalizedCode)
  if (exact) {
    const canonicalToken = normalizeProficiencyLevelToken(exact.canonicalLevelCode)
    const canonicalNameToken = normalizeProficiencyLevelToken(exact.canonicalLevelName)
    const exactMatch = levels.find((level) => {
      return (
        normalizeProficiencyLevelToken(level.code) === canonicalToken ||
        normalizeProficiencyLevelToken(level.display_name) === canonicalNameToken ||
        normalizeProficiencyLevelToken(level.short_name) === canonicalToken
      )
    })
    if (exactMatch) {
      return exactMatch
    }
  }

  const legacyBandCode = toLegacyProficiencyBandCode(normalizedCode, 'junior')
  const representativeCanonicalCode = normalizeProficiencyLevelToken(
    getRepresentativeCanonicalLevelCode(legacyBandCode)
  )

  return (
    levels.find((level) => {
      return (
        normalizeProficiencyLevelToken(level.code) === representativeCanonicalCode ||
        normalizeProficiencyLevelToken(level.short_name) === representativeCanonicalCode
      )
    }) ?? null
  )
}

export function buildProficiencyFrameworkDescriptor(level: {
  code: string
  display_name?: string | null
}): ProficiencyFrameworkDescriptor {
  const normalizedCode = normalizeProficiencyLevelToken(level.code)
  const normalizedName = normalizeProficiencyLevelToken(level.display_name)
  const exact =
    findExactProficiencyLevelDescriptor(normalizedCode) ??
    findExactProficiencyLevelDescriptor(normalizedName)

  if (exact) {
    return {
      source: 'suar-kb-v5',
      matchType: 'exact_level',
      careerBand: exact.careerBand,
      canonicalLevelCode: exact.canonicalLevelCode,
      canonicalLevelName: exact.canonicalLevelName,
      canonicalLevelNumber: exact.canonicalLevelNumber,
      summary: exact.summary,
      levelDimensions: exact.levelDimensions,
      typicalSigns: exact.typicalSigns,
      recommendedCanonicalLevels: [
        {
          code: exact.canonicalLevelCode,
          name: exact.canonicalLevelName,
          number: exact.canonicalLevelNumber,
        },
      ],
    }
  }

  const broad =
    findBroadProficiencyBandDescriptor(normalizedCode) ??
    findBroadProficiencyBandDescriptor(normalizedName)

  if (broad) {
    return {
      source: 'suar-kb-v5',
      matchType: 'broad_band',
      careerBand: broad.careerBand,
      canonicalLevelCode: null,
      canonicalLevelName: null,
      canonicalLevelNumber: null,
      summary: broad.summary,
      levelDimensions: null,
      typicalSigns: [],
      recommendedCanonicalLevels: broad.recommendedCanonicalLevels,
    }
  }

  return {
    source: 'suar-kb-v5',
    matchType: 'unknown',
    careerBand: null,
    canonicalLevelCode: null,
    canonicalLevelName: null,
    canonicalLevelNumber: null,
    summary: 'No direct knowledge-base mapping found for this proficiency code yet.',
    levelDimensions: null,
    typicalSigns: [],
    recommendedCanonicalLevels: [],
  }
}
