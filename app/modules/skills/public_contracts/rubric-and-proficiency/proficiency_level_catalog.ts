import {
  DEFAULT_HIGH_PROFICIENCY_THRESHOLD,
  LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE,
  LEGACY_PROFICIENCY_COMPATIBILITY_TOKENS,
  listExactProficiencyLevelDescriptors,
  normalizeProficiencyLevelToken,
  type LegacyProficiencyBandCode,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'
import { toLegacyProficiencyBandCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_mapping'

export interface CanonicalProficiencyLevelOption {
  value: string
  label: string
  shortLabel: string
  code: string
  careerBand: string
  legacyBandCode: LegacyProficiencyBandCode
  order: number
  aliases: string[]
  minPercentage: number
  maxPercentage: number
  midpointPercentage: number
}

const TOTAL_CANONICAL_PROFICIENCY_LEVELS = listExactProficiencyLevelDescriptors().length
const LEGACY_BAND_TO_CANONICAL_VALUE: Record<LegacyProficiencyBandCode, string> =
  Object.fromEntries(
    Object.entries(LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE).map(
      ([legacyBandCode, canonicalLevelCode]) => [legacyBandCode, canonicalLevelCode.toLowerCase()]
    )
  ) as Record<LegacyProficiencyBandCode, string>

const CANONICAL_PROFICIENCY_LEVEL_OPTIONS: CanonicalProficiencyLevelOption[] =
  listExactProficiencyLevelDescriptors().map((descriptor, index) => ({
    value: descriptor.canonicalLevelCode.toLowerCase(),
    label: `${descriptor.canonicalLevelCode} · ${descriptor.canonicalLevelName}`,
    shortLabel: descriptor.canonicalLevelName,
    code: descriptor.canonicalLevelCode,
    careerBand: descriptor.careerBand,
    legacyBandCode: descriptor.legacyBandCode,
    order: index + 1,
    aliases: descriptor.aliases,
    minPercentage: Number(((index / TOTAL_CANONICAL_PROFICIENCY_LEVELS) * 100).toFixed(1)),
    maxPercentage: Number((((index + 1) / TOTAL_CANONICAL_PROFICIENCY_LEVELS) * 100).toFixed(1)),
    midpointPercentage: Number(
      (((index + 0.5) / TOTAL_CANONICAL_PROFICIENCY_LEVELS) * 100).toFixed(1)
    ),
  }))

export function listCanonicalProficiencyLevelOptions(): CanonicalProficiencyLevelOption[] {
  return CANONICAL_PROFICIENCY_LEVEL_OPTIONS
}

export function findCanonicalProficiencyLevelOption(
  value: string | null | undefined
): CanonicalProficiencyLevelOption | null {
  const normalizedValue = normalizeProficiencyLevelToken(value)
  if (!normalizedValue) {
    return null
  }

  const exactMatch =
    CANONICAL_PROFICIENCY_LEVEL_OPTIONS.find((option) => {
      if (
        normalizeProficiencyLevelToken(option.value) === normalizedValue ||
        normalizeProficiencyLevelToken(option.code) === normalizedValue ||
        normalizeProficiencyLevelToken(option.shortLabel) === normalizedValue
      ) {
        return true
      }

      return option.aliases.some(
        (alias) => normalizeProficiencyLevelToken(alias) === normalizedValue
      )
    }) ?? null

  if (exactMatch) {
    return exactMatch
  }

  if (!LEGACY_PROFICIENCY_COMPATIBILITY_TOKENS.has(normalizedValue)) {
    return null
  }

  const legacyBandCode = toLegacyProficiencyBandCode(normalizedValue, 'junior')
  const representativeCanonicalValue = LEGACY_BAND_TO_CANONICAL_VALUE[legacyBandCode]

  return (
    CANONICAL_PROFICIENCY_LEVEL_OPTIONS.find(
      (option) => normalizeProficiencyLevelToken(option.value) === representativeCanonicalValue
    ) ?? null
  )
}

export function getCanonicalProficiencyLevelLabel(
  value: string | null | undefined,
  fallback: string = 'Unrated'
): string {
  return findCanonicalProficiencyLevelOption(value)?.label ?? value ?? fallback
}

export function getCanonicalProficiencyLevelValue(
  value: string | null | undefined,
  fallback: string = 'l4'
): string {
  return findCanonicalProficiencyLevelOption(value)?.value ?? fallback
}

export function getPreferredTaskRequirementLevelValue(
  options: Array<
    Pick<CanonicalProficiencyLevelOption, 'value'>
  > = CANONICAL_PROFICIENCY_LEVEL_OPTIONS
): string {
  const preferredValues = ['l4', 'l3', 'l1']

  for (const preferredValue of preferredValues) {
    if (options.some((option) => normalizeProficiencyLevelToken(option.value) === preferredValue)) {
      return preferredValue
    }
  }

  const firstAssessedLevel = options.find(
    (option) => normalizeProficiencyLevelToken(option.value) !== 'l0'
  )

  return firstAssessedLevel?.value ?? options[0]?.value ?? 'l4'
}

export function getCanonicalProficiencyLevelOrder(
  value: string | null | undefined,
  fallback: number = 1
): number {
  return findCanonicalProficiencyLevelOption(value)?.order ?? fallback
}

export function getCanonicalProficiencyMidpointPercentage(
  value: string | null | undefined,
  fallback: number = CANONICAL_PROFICIENCY_LEVEL_OPTIONS[0]?.midpointPercentage ?? 3.3
): number {
  return findCanonicalProficiencyLevelOption(value)?.midpointPercentage ?? fallback
}

export function getCanonicalProficiencyLevelValueFromPercentage(
  percentage: number,
  fallback: string = CANONICAL_PROFICIENCY_LEVEL_OPTIONS[
    CANONICAL_PROFICIENCY_LEVEL_OPTIONS.length - 1
  ]?.value ?? 'l14'
): string {
  const boundedPercentage = Math.max(0, Math.min(100, percentage))

  for (const option of CANONICAL_PROFICIENCY_LEVEL_OPTIONS) {
    if (boundedPercentage >= option.minPercentage && boundedPercentage < option.maxPercentage) {
      return option.value
    }
  }

  return fallback
}

export function isHighCanonicalProficiencyLevel(
  value: string | null | undefined,
  threshold: string = DEFAULT_HIGH_PROFICIENCY_THRESHOLD
): boolean {
  const levelOrder = findCanonicalProficiencyLevelOption(value)?.order
  const thresholdOrder = findCanonicalProficiencyLevelOption(threshold)?.order

  if (!levelOrder || !thresholdOrder) {
    return false
  }

  return levelOrder >= thresholdOrder
}
/**
 * Stable provider-owned proficiency presentation options and normalization helpers.
 */
