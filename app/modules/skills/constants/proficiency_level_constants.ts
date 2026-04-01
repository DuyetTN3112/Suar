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

export const CANONICAL_PROFICIENCY_LEVEL_VALUES = Object.values(
  CanonicalProficiencyLevelCode
)

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

export const DEFAULT_HIGH_PROFICIENCY_THRESHOLD =
  CanonicalProficiencyLevelCode.L10

const EXACT_PROFICIENCY_LEVELS: ExactProficiencyLevelDescriptor[] = [
  {
    aliases: ['l0', 'unassessed'],
    careerBand: 'None',
    legacyBandCode: 'beginner',
    canonicalLevelCode: 'L0',
    canonicalLevelName: 'Unassessed',
    canonicalLevelNumber: 0,
    summary: 'No verified evidence has been accepted for this skill yet.',
    levelDimensions: {
      knowledge: 'No reliable verified baseline yet.',
      execution: 'Execution evidence is absent or unverified.',
      autonomy: 'Cannot infer autonomy from current evidence.',
      complexity: 'Complexity handling is unknown.',
      quality: 'Quality cannot be trusted from current data.',
      collaboration: 'Collaboration signal not established.',
      problemSolving: 'Problem-solving behavior not yet evidenced.',
      impact: 'Impact level cannot be classified.',
      consistency: 'No repeated proof exists.',
      communication: 'Communication quality is not yet evidenced.',
    },
    typicalSigns: [
      'Only self-declared or imported skill data exists',
      'No confirmed reviewed task evidence',
      'No accepted reviewer confidence signal',
    ],
  },
  {
    aliases: ['l1', 'beginner'],
    careerBand: 'Beginner',
    legacyBandCode: 'beginner',
    canonicalLevelCode: 'L1',
    canonicalLevelName: 'Beginner',
    canonicalLevelNumber: 1,
    summary: 'Basic awareness. Needs close instruction and support for real work.',
    levelDimensions: {
      knowledge: 'Recognizes basic concepts and terminology.',
      execution: 'Can only reproduce very simple steps.',
      autonomy: 'Needs detailed guidance and close supervision.',
      complexity: 'Suitable only for very low-complexity tasks.',
      quality: 'Output requires frequent correction.',
      collaboration: 'Needs support to work inside team processes.',
      problemSolving: 'Struggles once flow deviates from examples.',
      impact: 'Impact should stay narrow and low risk.',
      consistency: 'Performance is not yet stable across tasks.',
      communication: 'Can answer basic questions but rarely frames reasoning clearly.',
    },
    typicalSigns: [
      'Follows tutorials or examples',
      'Needs correction on fundamentals',
      'Evidence is incomplete without support',
    ],
  },
  {
    aliases: ['l2', 'elementary'],
    careerBand: 'Beginner',
    legacyBandCode: 'elementary',
    canonicalLevelCode: 'L2',
    canonicalLevelName: 'Elementary',
    canonicalLevelNumber: 2,
    summary: 'Can complete simple work with guidance when scope is very clear.',
    levelDimensions: {
      knowledge: 'Understands basic flows and common terms.',
      execution: 'Can deliver narrow changes with a checklist.',
      autonomy: 'Still depends on guidance for sequencing and validation.',
      complexity: 'Handles simple, low-risk tasks only.',
      quality: 'Work is acceptable after review and revision.',
      collaboration: 'Participates when process is explicit.',
      problemSolving: 'Needs help for ambiguity and edge cases.',
      impact: 'Limited to contained changes.',
      consistency: 'Can repeat simple work in similar contexts.',
      communication: 'Can explain basic choices in simple language.',
    },
    typicalSigns: [
      'Completes small checklist-driven tasks',
      'Needs review before merge or delivery',
      'Struggles with ambiguity',
    ],
  },
  {
    aliases: ['l3', 'junior_low'],
    careerBand: 'Junior',
    legacyBandCode: 'junior',
    canonicalLevelCode: 'L3',
    canonicalLevelName: 'Junior Low',
    canonicalLevelNumber: 3,
    summary: 'Can perform simple real tasks with guidance and feedback.',
    levelDimensions: {
      knowledge: 'Understands enough fundamentals to work in real project context.',
      execution: 'Can finish minor bug fixes or small scoped changes.',
      autonomy: 'Needs guidance for edge cases and sequencing.',
      complexity: 'Works best on low-complexity tasks.',
      quality: 'Output becomes acceptable after review feedback.',
      collaboration: 'Communicates blockers when prompted.',
      problemSolving: 'Handles common cases but not deeper trade-offs.',
      impact: 'Contributions affect isolated task slices.',
      consistency: 'Can repeat similar starter tasks.',
      communication: 'Progress reporting is basic and reactive.',
    },
    typicalSigns: [
      'Completes minor bug fixes',
      'Works from detailed requirements',
      'Produces acceptable work after review',
    ],
  },
  {
    aliases: ['l4', 'junior_solid'],
    careerBand: 'Junior',
    legacyBandCode: 'junior',
    canonicalLevelCode: 'L4',
    canonicalLevelName: 'Junior Solid',
    canonicalLevelNumber: 4,
    summary: 'Can complete small tasks independently when scope is clear.',
    levelDimensions: {
      knowledge: 'Applies standard patterns without constant prompting.',
      execution: 'Delivers small features and routine improvements.',
      autonomy: 'Works independently on clear scope.',
      complexity: 'Handles low-complexity tasks and simple edge cases.',
      quality: 'Includes basic validation and testing.',
      collaboration: 'Responds well to review feedback.',
      problemSolving: 'Can ask targeted clarification questions.',
      impact: 'Safe for bounded production-facing work.',
      consistency: 'Shows steady low-risk delivery.',
      communication: 'Explains progress and blockers clearly enough for task-level work.',
    },
    typicalSigns: [
      'Completes small features',
      'Handles basic testing',
      'Shows consistent low-risk delivery',
    ],
  },
  {
    aliases: ['l5', 'junior_high'],
    careerBand: 'Junior',
    legacyBandCode: 'junior',
    canonicalLevelCode: 'L5',
    canonicalLevelName: 'Junior High',
    canonicalLevelNumber: 5,
    summary: 'Handles moderate tasks with occasional support and is close to middle-level work.',
    levelDimensions: {
      knowledge: 'Understands common trade-offs in the skill area.',
      execution: 'Can own a moderate task end to end in controlled context.',
      autonomy: 'Mostly independent with checkpoint-based support.',
      complexity: 'Handles moderate tasks and common edge cases.',
      quality: 'Produces reliable outputs for moderate scope.',
      collaboration: 'Can occasionally support more junior peers.',
      problemSolving: 'Can explain basic trade-offs and mitigation steps.',
      impact: 'Work can affect a wider module with review.',
      consistency: 'Shows repeated moderate-task success.',
      communication: 'Communicates progress and asks for help at the right times.',
    },
    typicalSigns: [
      'Owns moderate tasks end-to-end',
      'Handles common edge cases',
      'Suitable for stretch work with checkpoints',
    ],
  },
  {
    aliases: ['l6', 'middle_low'],
    careerBand: 'Middle',
    legacyBandCode: 'middle',
    canonicalLevelCode: 'L6',
    canonicalLevelName: 'Middle Low',
    canonicalLevelNumber: 6,
    summary: 'Can independently own medium-complexity tasks with acceptable quality.',
    levelDimensions: {
      knowledge: 'Understands task-level design and integration needs.',
      execution: 'Plans and delivers medium tasks independently.',
      autonomy: 'Clarifies requirements and manages own execution.',
      complexity: 'Handles medium complexity with some broader review.',
      quality: 'Output is maintainable and generally production-ready.',
      collaboration: 'Coordinates with adjacent contributors.',
      problemSolving: 'Identifies risks and proposes mitigation.',
      impact: 'Affects modules or related subsystems.',
      consistency: 'Medium-scope delivery is repeatable.',
      communication: 'Progress and risk reporting are proactive.',
    },
    typicalSigns: [
      'Decomposes medium tasks',
      'Identifies implementation risks',
      'Integrates with related systems',
    ],
  },
  {
    aliases: ['l7', 'middle_solid', 'middle', 'mid'],
    careerBand: 'Middle',
    legacyBandCode: 'middle',
    canonicalLevelCode: 'L7',
    canonicalLevelName: 'Middle Solid',
    canonicalLevelNumber: 7,
    summary: 'Consistently delivers medium-complexity work with good quality and maintainability.',
    levelDimensions: {
      knowledge: 'Understands maintainability, patterns, and task-level design.',
      execution: 'Delivers medium-complexity work consistently.',
      autonomy: 'Requires minimal supervision for normal medium-scope work.',
      complexity: 'Handles medium complexity comfortably.',
      quality: 'Output is maintainable and team-compatible.',
      collaboration: 'Reviews simple work by others and handles feedback constructively.',
      problemSolving: 'Works through blockers without waiting for rescue.',
      impact: 'Contributions improve module-level reliability and delivery.',
      consistency: 'Repeated success across several tasks.',
      communication: 'Reasoning and progress are clear to teammates.',
    },
    typicalSigns: [
      'Designs module-level solutions',
      'Writes maintainable work',
      'Shows repeated successful delivery',
    ],
  },
  {
    aliases: ['l8', 'middle_high'],
    careerBand: 'Middle',
    legacyBandCode: 'middle',
    canonicalLevelCode: 'L8',
    canonicalLevelName: 'Middle High',
    canonicalLevelNumber: 8,
    summary: 'Handles complex tasks, ambiguity, and cross-functional coordination.',
    levelDimensions: {
      knowledge: 'Sees trade-offs across implementation paths.',
      execution: 'Can refactor or deliver complex changes safely.',
      autonomy: 'Works independently under ambiguity.',
      complexity: 'Handles complex requirements and dependency edges.',
      quality: 'Considers maintainability, safety, and downstream effects.',
      collaboration: 'Supports peers and coordinates dependencies.',
      problemSolving: 'Handles edge cases and ambiguity well.',
      impact: 'Affects wider project areas and delivery confidence.',
      consistency: 'Complex-task performance is becoming dependable.',
      communication: 'Coordinates clearly across functions or teammates.',
    },
    typicalSigns: [
      'Refactors existing work safely',
      'Coordinates dependencies',
      'Makes good technical trade-offs',
    ],
  },
  {
    aliases: ['l9', 'senior_low'],
    careerBand: 'Senior',
    legacyBandCode: 'senior',
    canonicalLevelCode: 'L9',
    canonicalLevelName: 'Senior Low',
    canonicalLevelNumber: 9,
    summary: 'Owns complex work and makes independent decisions with wider consequences.',
    levelDimensions: {
      knowledge: 'Sees hidden risks and production-level considerations.',
      execution: 'Delivers substantial components or workstreams.',
      autonomy: 'Makes sound independent decisions.',
      complexity: 'Works effectively with unclear or evolving requirements.',
      quality: 'Protects system quality under complexity.',
      collaboration: 'Mentors and reviews others effectively.',
      problemSolving: 'Surfaces hidden risk early and resolves it pragmatically.',
      impact: 'Influences a wider technical area.',
      consistency: 'Complex ownership is repeatable.',
      communication: 'Communicates judgment, risk, and trade-offs clearly.',
    },
    typicalSigns: [
      'Designs substantial components',
      'Handles production-level concerns',
      'Mentors others on complex work',
    ],
  },
  {
    aliases: ['l10', 'senior_solid', 'senior'],
    careerBand: 'Senior',
    legacyBandCode: 'senior',
    canonicalLevelCode: 'L10',
    canonicalLevelName: 'Senior Solid',
    canonicalLevelNumber: 10,
    summary: 'Leads significant solution areas and improves standards, quality, and team capability.',
    levelDimensions: {
      knowledge: 'Understands broader architectural and quality patterns.',
      execution: 'Leads major solution areas with strong quality.',
      autonomy: 'Operates with high independence and judgment.',
      complexity: 'Resolves conflicts between requirements and constraints.',
      quality: 'Raises standards for maintainability and correctness.',
      collaboration: 'Mentors effectively and improves team capability.',
      problemSolving: 'Finds durable solutions, not only local fixes.',
      impact: 'Improves multi-module quality and delivery.',
      consistency: 'High-level performance is dependable.',
      communication: 'Can align others around technical decisions.',
    },
    typicalSigns: [
      'Defines reusable patterns',
      'Improves team quality standards',
      'Contributes to architecture decisions',
    ],
  },
  {
    aliases: ['l11', 'senior_high'],
    careerBand: 'Senior',
    legacyBandCode: 'senior',
    canonicalLevelCode: 'L11',
    canonicalLevelName: 'Senior High',
    canonicalLevelNumber: 11,
    summary: 'Influences multiple areas and handles high ambiguity with strategic trade-offs.',
    levelDimensions: {
      knowledge: 'Sees cross-area and long-term consequences.',
      execution: 'Coordinates complex delivery across areas.',
      autonomy: 'Trusted with highly ambiguous work.',
      complexity: 'Handles multi-area complexity and conflicting priorities.',
      quality: 'Reduces long-term risk while shipping.',
      collaboration: 'Guides others through complex delivery.',
      problemSolving: 'Balances immediate needs against strategic health.',
      impact: 'Influences several modules or teams.',
      consistency: 'Strategic execution is repeatable.',
      communication: 'Builds alignment across broader stakeholder groups.',
    },
    typicalSigns: [
      'Coordinates across modules or teams',
      'Improves team processes',
      'Guides others through complexity',
    ],
  },
  {
    aliases: ['l12', 'lead'],
    careerBand: 'Lead',
    legacyBandCode: 'lead',
    canonicalLevelCode: 'L12',
    canonicalLevelName: 'Lead',
    canonicalLevelNumber: 12,
    summary: 'Leads delivery, standards, and coordination across teams or major project areas.',
    levelDimensions: {
      knowledge: 'Combines technical, delivery, and business framing.',
      execution: 'Shapes delivery approach across contributors.',
      autonomy: 'Owns team-level direction and escalation.',
      complexity: 'Handles cross-team and cross-discipline complexity.',
      quality: 'Sets standards, not only follows them.',
      collaboration: 'Aligns multiple contributors around outcomes.',
      problemSolving: 'Resolves escalations and keeps delivery moving.',
      impact: 'Raises whole-team capability and delivery consistency.',
      consistency: 'Lead-level responsibility is sustained.',
      communication: 'Communicates clearly across technical and business contexts.',
    },
    typicalSigns: [
      'Aligns multiple contributors',
      'Defines delivery approach',
      'Balances technical and business constraints',
    ],
  },
  {
    aliases: ['l13', 'principal'],
    careerBand: 'Principal',
    legacyBandCode: 'principal',
    canonicalLevelCode: 'L13',
    canonicalLevelName: 'Principal',
    canonicalLevelNumber: 13,
    summary: 'Shapes architecture, standards, and capability strategy beyond one team.',
    levelDimensions: {
      knowledge: 'Operates at system and organizational depth.',
      execution: 'Defines standards and strategic technical direction.',
      autonomy: 'Trusted with organization-level judgment.',
      complexity: 'Resolves system-level complexity.',
      quality: 'Builds reusable quality patterns at scale.',
      collaboration: 'Mentors senior contributors and aligns leadership.',
      problemSolving: 'Solves non-local, high-leverage problems.',
      impact: 'Influences organization-wide practice.',
      consistency: 'Principal-level influence is sustained across contexts.',
      communication: 'Frames long-term direction clearly for many audiences.',
    },
    typicalSigns: [
      'Sets technical direction',
      'Defines reusable standards',
      'Mentors senior contributors',
    ],
  },
  {
    aliases: ['l14', 'expert', 'master', 'expert_master'],
    careerBand: 'Expert',
    legacyBandCode: 'master',
    canonicalLevelCode: 'L14',
    canonicalLevelName: 'Expert / Master',
    canonicalLevelNumber: 14,
    summary: 'Recognized expert with strong repeated evidence across exceptional complexity.',
    levelDimensions: {
      knowledge: 'Demonstrates deep and unusual mastery.',
      execution: 'Solves rare, high-stakes, or exceptional problems.',
      autonomy: 'Operates as a top-level authority in the domain.',
      complexity: 'Handles exceptional complexity with credibility.',
      quality: 'Defines what excellent looks like in the domain.',
      collaboration: 'Trusted by expert reviewers and senior leadership.',
      problemSolving: 'Creates new approaches where normal playbooks fail.',
      impact: 'Shapes standards and outcomes at very high leverage.',
      consistency: 'Strong evidence appears across contexts and time.',
      communication: 'Can teach, justify, and defend expert judgment clearly.',
    },
    typicalSigns: [
      'Defines new standards',
      'Resolves rare complex problems',
      'Shows strong evidence across contexts',
    ],
  },
]

const BROAD_PROFICIENCY_BANDS: BroadProficiencyBandDescriptor[] = [
  {
    aliases: ['beginner_band'],
    careerBand: 'Beginner',
    summary: 'Broad beginner band. Prefer clarifying whether the user is at L1 or L2.',
    recommendedCanonicalLevels: [
      { code: 'L1', name: 'Beginner', number: 1 },
      { code: 'L2', name: 'Elementary', number: 2 },
    ],
  },
  {
    aliases: ['junior_band', 'junior'],
    careerBand: 'Junior',
    summary: 'Broad junior band. Prefer clarifying whether the user is L3, L4, or L5.',
    recommendedCanonicalLevels: [
      { code: 'L3', name: 'Junior Low', number: 3 },
      { code: 'L4', name: 'Junior Solid', number: 4 },
      { code: 'L5', name: 'Junior High', number: 5 },
    ],
  },
  {
    aliases: ['middle_band'],
    careerBand: 'Middle',
    summary: 'Broad middle band. Prefer clarifying whether the user is L6, L7, or L8.',
    recommendedCanonicalLevels: [
      { code: 'L6', name: 'Middle Low', number: 6 },
      { code: 'L7', name: 'Middle Solid', number: 7 },
      { code: 'L8', name: 'Middle High', number: 8 },
    ],
  },
  {
    aliases: ['senior_band'],
    careerBand: 'Senior',
    summary: 'Broad senior band. Prefer clarifying whether the user is L9, L10, or L11.',
    recommendedCanonicalLevels: [
      { code: 'L9', name: 'Senior Low', number: 9 },
      { code: 'L10', name: 'Senior Solid', number: 10 },
      { code: 'L11', name: 'Senior High', number: 11 },
    ],
  },
]

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
    recommendedCanonicalLevels: descriptor.recommendedCanonicalLevels.map((level) => ({ ...level })),
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
