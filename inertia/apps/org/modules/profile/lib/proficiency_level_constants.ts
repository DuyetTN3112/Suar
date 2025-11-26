export type LegacyProficiencyBandCode =
  | 'beginner'
  | 'elementary'
  | 'junior'
  | 'middle'
  | 'senior'
  | 'lead'
  | 'principal'
  | 'master'

export interface ExactProficiencyLevelDescriptor {
  aliases: string[]
  legacyBandCode: LegacyProficiencyBandCode
  canonicalLevelCode: string
  canonicalLevelName: string
  summary: string
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

const EXACT_PROFICIENCY_LEVELS: ExactProficiencyLevelDescriptor[] = [
  { aliases: ['l0', 'unassessed'], legacyBandCode: 'beginner', canonicalLevelCode: 'L0', canonicalLevelName: 'Unassessed', summary: 'No verified evidence has been accepted for this skill yet.' },
  { aliases: ['l1', 'beginner'], legacyBandCode: 'beginner', canonicalLevelCode: 'L1', canonicalLevelName: 'Beginner', summary: 'Basic awareness. Needs close instruction and support for real work.' },
  { aliases: ['l2', 'elementary'], legacyBandCode: 'elementary', canonicalLevelCode: 'L2', canonicalLevelName: 'Elementary', summary: 'Can complete simple work with guidance when scope is very clear.' },
  { aliases: ['l3', 'junior_low'], legacyBandCode: 'junior', canonicalLevelCode: 'L3', canonicalLevelName: 'Junior Low', summary: 'Can perform simple real tasks with guidance and feedback.' },
  { aliases: ['l4', 'junior_solid'], legacyBandCode: 'junior', canonicalLevelCode: 'L4', canonicalLevelName: 'Junior Solid', summary: 'Can complete small tasks independently when scope is clear.' },
  { aliases: ['l5', 'junior_high'], legacyBandCode: 'junior', canonicalLevelCode: 'L5', canonicalLevelName: 'Junior High', summary: 'Handles moderate tasks with occasional support and is close to middle-level work.' },
  { aliases: ['l6', 'middle_low'], legacyBandCode: 'middle', canonicalLevelCode: 'L6', canonicalLevelName: 'Middle Low', summary: 'Can independently own medium-complexity tasks with acceptable quality.' },
  { aliases: ['l7', 'middle_solid', 'middle', 'mid'], legacyBandCode: 'middle', canonicalLevelCode: 'L7', canonicalLevelName: 'Middle Solid', summary: 'Consistently delivers medium-complexity work with good quality and maintainability.' },
  { aliases: ['l8', 'middle_high'], legacyBandCode: 'middle', canonicalLevelCode: 'L8', canonicalLevelName: 'Middle High', summary: 'Handles complex tasks, ambiguity, and cross-functional coordination.' },
  { aliases: ['l9', 'senior_low'], legacyBandCode: 'senior', canonicalLevelCode: 'L9', canonicalLevelName: 'Senior Low', summary: 'Owns complex work and makes independent decisions with wider consequences.' },
  { aliases: ['l10', 'senior_solid', 'senior'], legacyBandCode: 'senior', canonicalLevelCode: 'L10', canonicalLevelName: 'Senior Solid', summary: 'Leads significant solution areas and improves standards, quality, and team capability.' },
  { aliases: ['l11', 'senior_high'], legacyBandCode: 'senior', canonicalLevelCode: 'L11', canonicalLevelName: 'Senior High', summary: 'Influences multiple areas and handles high ambiguity with strategic trade-offs.' },
  { aliases: ['l12', 'lead'], legacyBandCode: 'lead', canonicalLevelCode: 'L12', canonicalLevelName: 'Lead', summary: 'Leads delivery, standards, and coordination across teams or major project areas.' },
  { aliases: ['l13', 'principal'], legacyBandCode: 'principal', canonicalLevelCode: 'L13', canonicalLevelName: 'Principal', summary: 'Shapes architecture, standards, and capability strategy beyond one team.' },
  { aliases: ['l14', 'expert', 'master', 'expert_master'], legacyBandCode: 'master', canonicalLevelCode: 'L14', canonicalLevelName: 'Expert / Master', summary: 'Recognized expert with strong repeated evidence across exceptional complexity.' },
]

const LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE: Record<
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

export function getRepresentativeCanonicalLevelCode(
  legacyBandCode: LegacyProficiencyBandCode
): string {
  return LEGACY_PROFICIENCY_BAND_TO_REPRESENTATIVE_CANONICAL_CODE[legacyBandCode]
}

export function listExactProficiencyLevelDescriptors(): ExactProficiencyLevelDescriptor[] {
  return EXACT_PROFICIENCY_LEVELS.map((descriptor) => ({
    ...descriptor,
    aliases: [...descriptor.aliases],
  }))
}

export function findExactProficiencyLevelDescriptor(
  levelCode: string | null | undefined
): ExactProficiencyLevelDescriptor | null {
  const normalizedLevelCode = normalizeProficiencyLevelToken(levelCode)
  if (!normalizedLevelCode) {
    return null
  }

  return (
    EXACT_PROFICIENCY_LEVELS.find((descriptor) =>
      descriptor.aliases.some((alias) => normalizeProficiencyLevelToken(alias) === normalizedLevelCode)
    ) ?? null
  )
}
