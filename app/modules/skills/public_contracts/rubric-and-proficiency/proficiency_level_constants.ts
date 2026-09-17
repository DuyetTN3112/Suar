import {
  BROAD_PROFICIENCY_BANDS,
  EXACT_PROFICIENCY_LEVELS,
} from './proficiency_level_data.js'

export type LevelDimensions = {
  knowledge: string
  execution: string
  autonomy: string
  complexity: string
  quality: string
  collaboration: string
  problemSolving: string
  impact: string
  consistency: string
  communication: string
}

export type LegacyProficiencyBandCode =
  | 'beginner'
  | 'elementary'
  | 'junior'
  | 'middle'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'master'

export enum CanonicalProficiencyLevelCode {
  L0 = 'l0',
  L1 = 'l1',
  L2 = 'l2',
  L3 = 'l3',
  L4 = 'l4',
  L5 = 'l5',
  L6 = 'l6',
  L7 = 'l7',
  L8 = 'l8',
  L9 = 'l9',
  L10 = 'l10',
  L11 = 'l11',
  L12 = 'l12',
  L13 = 'l13',
  L14 = 'l14',
}

export const CANONICAL_PROFICIENCY_LEVEL_VALUES = Object.values(CanonicalProficiencyLevelCode)

export type ExactProficiencyLevelDescriptor = {
  aliases: string[]
  careerBand: string
  legacyBandCode: LegacyProficiencyBandCode
  canonicalLevelCode: string
  canonicalLevelName: string
  canonicalLevelNumber: number
  summary: string
  levelDimensions: LevelDimensions
  typicalSigns: string[]
}

export type BroadProficiencyBandDescriptor = {
  aliases: string[]
  careerBand: string
  summary: string
  recommendedCanonicalLevels: Array<{
    code: string
    name: string
    number: number
  }>
}

export interface CanonicalProficiencyLevelOption {
  label: string
  labelVi: string
  value: string
  code: string
  careerBand: string
  legacyBandCode: LegacyProficiencyBandCode
  description: string
  minPercentage: number
  maxPercentage: number
  colorHex: string
  order: number
}

export function normalizeProficiencyLevelToken(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export const CANONICAL_PROFICIENCY_LEVEL_COLORS = [
  '#94a3b8',
  '#60a5fa',
  '#38bdf8',
  '#22c55e',
  '#34d399',
  '#84cc16',
  '#eab308',
  '#f59e0b',
  '#fb923c',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#a855f7',
  '#8b5cf6',
  '#7c3aed',
] as const

export const LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE: Record<
  LegacyProficiencyBandCode,
  string
> = {
  beginner: 'L1',
  elementary: 'L2',
  junior: 'L4',
  middle: 'L7',
  senior: 'L10',
  lead: 'L12',
  principal: 'L13',
  master: 'L14',
}

export const LEGACY_PROFICIENCY_COMPATIBILITY_TOKENS = new Set<string>([
  ...Object.keys(LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE),
  'mid',
])

export const DEFAULT_HIGH_PROFICIENCY_THRESHOLD = CanonicalProficiencyLevelCode.L10

export function findExactProficiencyLevelDescriptor(
  levelCode: string | null | undefined
): ExactProficiencyLevelDescriptor | null {
  const normalizedLevelCode = normalizeProficiencyLevelToken(levelCode)
  if (!normalizedLevelCode) {
    return null
  }

  return (
    EXACT_PROFICIENCY_LEVELS.find((descriptor) =>
      descriptor.aliases.some(
        (alias) => normalizeProficiencyLevelToken(alias) === normalizedLevelCode
      )
    ) ?? null
  )
}

export function findBroadProficiencyBandDescriptor(
  levelCode: string | null | undefined
): BroadProficiencyBandDescriptor | null {
  const normalizedLevelCode = normalizeProficiencyLevelToken(levelCode)
  if (!normalizedLevelCode) {
    return null
  }

  if (normalizedLevelCode === 'beginner' || normalizedLevelCode === 'elementary') {
    return BROAD_PROFICIENCY_BANDS[0] ?? null
  }
  if (normalizedLevelCode === 'junior') {
    return BROAD_PROFICIENCY_BANDS[1] ?? null
  }
  if (normalizedLevelCode === 'middle' || normalizedLevelCode === 'mid') {
    return BROAD_PROFICIENCY_BANDS[2] ?? null
  }
  if (normalizedLevelCode === 'senior') {
    return BROAD_PROFICIENCY_BANDS[3] ?? null
  }

  return null
}

export function getRepresentativeCanonicalLevelCode(
  legacyBandCode: LegacyProficiencyBandCode
): string {
  return LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE[legacyBandCode]
}

export function listExactProficiencyLevelDescriptors(): ExactProficiencyLevelDescriptor[] {
  return EXACT_PROFICIENCY_LEVELS.map((descriptor) => ({
    ...descriptor,
    aliases: [...descriptor.aliases],
    levelDimensions: { ...descriptor.levelDimensions },
    typicalSigns: [...descriptor.typicalSigns],
  }))
}

export function listBroadProficiencyBandDescriptors(): BroadProficiencyBandDescriptor[] {
  return BROAD_PROFICIENCY_BANDS.map((descriptor) => ({
    ...descriptor,
    aliases: [...descriptor.aliases],
    recommendedCanonicalLevels: descriptor.recommendedCanonicalLevels.map((level) => ({
      ...level,
    })),
  }))
}

export const CANONICAL_PROFICIENCY_LEVEL_OPTIONS: CanonicalProficiencyLevelOption[] =
  listExactProficiencyLevelDescriptors().map((descriptor, index, allDescriptors) => ({
    label: `${descriptor.canonicalLevelCode} · ${descriptor.canonicalLevelName}`,
    labelVi: descriptor.canonicalLevelName,
    value: descriptor.canonicalLevelCode.toLowerCase(),
    code: descriptor.canonicalLevelCode,
    careerBand: descriptor.careerBand,
    legacyBandCode: descriptor.legacyBandCode,
    description: descriptor.canonicalLevelName,
    minPercentage: Number(((index / allDescriptors.length) * 100).toFixed(1)),
    maxPercentage: Number((((index + 1) / allDescriptors.length) * 100).toFixed(1)),
    colorHex: CANONICAL_PROFICIENCY_LEVEL_COLORS[index] ?? '#94a3b8',
    order: index + 1,
  }))

/**
 * Stable provider-owned proficiency facts and normalization rules.
 *
 * Consumers outside `skills` must import this public contract, never a private
 * constants folder.
 */
