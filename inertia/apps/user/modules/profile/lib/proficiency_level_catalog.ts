import {
  CANONICAL_PROFICIENCY_LEVEL_COLORS,
  LEGACY_PROFICIENCY_COMPATIBILITY_TOKENS,
  findExactProficiencyLevelDescriptor,
  getRepresentativeCanonicalLevelCode,
  listExactProficiencyLevelDescriptors,
  normalizeProficiencyLevelToken,
  type ExactProficiencyLevelDescriptor,
} from './proficiency_level_constants'

export interface FrontendCanonicalProficiencyLevelOption {
  value: string
  label: string
  labelVi: string
  description: string
  minPercentage: number
  maxPercentage: number
  colorHex: string
  order: number
}

const FRONTEND_LABELS_VI: Record<string, string> = {
  L0: 'Not assessed',
  L1: 'Beginner',
  L2: 'Elementary',
  L3: 'Low junior',
  L4: 'Solid junior',
  L5: 'High junior',
  L6: 'Low middle',
  L7: 'Solid middle',
  L8: 'High middle',
  L9: 'Low senior',
  L10: 'Solid senior',
  L11: 'High senior',
  L12: 'Lead',
  L13: 'Principal',
  L14: 'Expert / Master',
}

const FRONTEND_DESCRIPTIONS_VI: Record<string, string> = {
  L0: 'No reliable review evidence yet',
  L1: 'Knows very basic foundations',
  L2: 'Can handle simple work with guidance',
  L3: 'Starts real tasks with small scope',
  L4: 'Delivers clear small tasks independently',
  L5: 'Near middle level on medium tasks',
  L6: 'Handles medium-complexity tasks independently',
  L7: 'Delivers stable, maintainable work',
  L8: 'Handles ambiguity and dependencies well',
  L9: 'Owns complex tasks with wider impact',
  L10: 'Raises quality and leads a solution area',
  L11: 'Influences multiple areas with strategic trade-offs',
  L12: 'Leads delivery and coordination across people',
  L13: 'Shapes standards and architecture beyond one team',
  L14: 'Very strong evidence across many contexts',
}

const EXACT_LEVELS = listExactProficiencyLevelDescriptors()
const TOTAL_CANONICAL_PROFICIENCY_LEVELS = EXACT_LEVELS.length

function buildFrontendCanonicalOption(
  descriptor: ExactProficiencyLevelDescriptor,
  index: number
): FrontendCanonicalProficiencyLevelOption {
  return {
    value: descriptor.canonicalLevelCode.toLowerCase(),
    label: `${descriptor.canonicalLevelCode} · ${descriptor.canonicalLevelName}`,
    labelVi: FRONTEND_LABELS_VI[descriptor.canonicalLevelCode] ?? descriptor.canonicalLevelName,
    description:
      FRONTEND_DESCRIPTIONS_VI[descriptor.canonicalLevelCode] ?? descriptor.summary,
    minPercentage: Number(((index / TOTAL_CANONICAL_PROFICIENCY_LEVELS) * 100).toFixed(1)),
    maxPercentage: Number(
      ((((index + 1) / TOTAL_CANONICAL_PROFICIENCY_LEVELS) * 100)).toFixed(1)
    ),
    colorHex: CANONICAL_PROFICIENCY_LEVEL_COLORS[index] ?? '#94a3b8',
    order: index + 1,
  }
}

const FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS: FrontendCanonicalProficiencyLevelOption[] =
  EXACT_LEVELS.map(buildFrontendCanonicalOption)

const FRONTEND_PROFICIENCY_LEVEL_OPTIONS_BY_ALIAS = new Map<
  string,
  FrontendCanonicalProficiencyLevelOption
>()

const FRONTEND_PROFICIENCY_LEVEL_LABELS = new Map(
  FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS.flatMap((option) => {
    const descriptor = findExactProficiencyLevelDescriptor(option.value)
    const aliases = new Set<string>([option.value])

    for (const alias of descriptor?.aliases ?? []) {
      aliases.add(normalizeProficiencyLevelToken(alias))
    }

    if (LEGACY_PROFICIENCY_COMPATIBILITY_TOKENS.has(option.value)) {
      aliases.add(option.value)
    }

    const legacyBandCode = descriptor?.legacyBandCode
    if (legacyBandCode) {
      const representativeCanonicalCode = normalizeProficiencyLevelToken(
        getRepresentativeCanonicalLevelCode(legacyBandCode)
      )
      if (representativeCanonicalCode === option.value) {
        aliases.add(legacyBandCode)
        if (legacyBandCode === 'middle') {
          aliases.add('mid')
        }
      }
    }

    return [...aliases].map((alias) => [alias, option.label] as const)
  })
)

for (const option of FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS) {
  FRONTEND_PROFICIENCY_LEVEL_OPTIONS_BY_ALIAS.set(option.value, option)
}

for (const [alias, label] of FRONTEND_PROFICIENCY_LEVEL_LABELS.entries()) {
  const matchedOption = FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS.find(
    (option) => option.label === label
  )
  if (matchedOption) {
    FRONTEND_PROFICIENCY_LEVEL_OPTIONS_BY_ALIAS.set(alias, matchedOption)
  }
}

export function listFrontendCanonicalProficiencyLevelOptions(): FrontendCanonicalProficiencyLevelOption[] {
  return FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS
}

export function findFrontendCanonicalProficiencyLevelOption(
  value: string | null | undefined
): FrontendCanonicalProficiencyLevelOption | null {
  const normalizedValue = normalizeProficiencyLevelToken(value)
  if (!normalizedValue) {
    return null
  }

  return FRONTEND_PROFICIENCY_LEVEL_OPTIONS_BY_ALIAS.get(normalizedValue) ?? null
}

export function getFrontendCanonicalProficiencyLevelLabel(
  value: string | null | undefined,
  fallback: string = 'Unrated'
): string {
  return findFrontendCanonicalProficiencyLevelOption(value)?.label ?? value ?? fallback
}

export function getFrontendPreferredTaskRequirementLevelValue(
  options: Array<Pick<FrontendCanonicalProficiencyLevelOption, 'value'>> = FRONTEND_CANONICAL_PROFICIENCY_LEVEL_OPTIONS
): string {
  const preferredValues = ['l4', 'l3', 'l1']

  for (const preferredValue of preferredValues) {
    if (options.some((option) => option.value === preferredValue)) {
      return preferredValue
    }
  }

  return options.find((option) => option.value !== 'l0')?.value ?? options[0]?.value ?? 'l4'
}
