import {
  listExactProficiencyLevelDescriptors,
  type LegacyProficiencyBandCode,
} from '#modules/skills/public_contracts/proficiency_level_constants'

export interface SystemDefaultProficiencyLevelSeed {
  ordinal: number
  code: string
  displayName: string
  shortName: string
  normalizedValue: number
  sortOrder: number
  genericDescription: string
  expectedKnowledge: string
  expectedExecution: string
  autonomyDescriptor: string
  complexityDescriptor: string
  qualityDescriptor: string
  collaborationDescriptor: string
  observableBehaviors: string[]
  positiveExamples: string[]
  negativeExamples: string[]
  evidenceGuidance: string
  ceilingGuidance: string
  legacyBandCode: LegacyProficiencyBandCode
}

export interface SystemDefaultProficiencyScaleSeed {
  code: 'system_default'
  name: string
  version: number
  isActive: true
  levels: SystemDefaultProficiencyLevelSeed[]
}

function buildPositiveExamples(
  displayName: string,
  expectedExecution: string,
  collaborationDescriptor: string
): string[] {
  return [
    `Evidence shows ${displayName} execution: ${expectedExecution}`,
    `Collaboration signal matches ${displayName}: ${collaborationDescriptor}`,
  ]
}

function buildNegativeExamples(
  displayName: string,
  autonomyDescriptor: string,
  qualityDescriptor: string
): string[] {
  return [
    `Claimed ${displayName} level still needs more support than expected: ${autonomyDescriptor}`,
    `Observed output quality falls short of ${displayName}: ${qualityDescriptor}`,
  ]
}

function buildEvidenceGuidance(displayName: string, observableBehaviors: string[]): string {
  return [
    `Verify ${displayName} through accepted task outcomes, reviewer rationale, and concrete artifacts.`,
    `Look for repeated signals such as ${observableBehaviors[0] ?? 'observable behavior'}.`,
  ].join(' ')
}

function buildCeilingGuidance(displayName: string, nextLevelName: string | null): string {
  if (!nextLevelName) {
    return `Only assign ${displayName} when evidence is repeated across contexts and reviewer credibility is strong.`
  }

  return `Do not exceed ${displayName} when task scope lacks enough complexity, autonomy, or impact to prove ${nextLevelName}.`
}

export function getSystemDefaultProficiencyScaleSeed(): SystemDefaultProficiencyScaleSeed {
  const exactLevels = listExactProficiencyLevelDescriptors()

  return {
    code: 'system_default',
    name: 'System Default Scale',
    version: 5,
    isActive: true,
    levels: exactLevels.map((descriptor, index) => {
      const nextLevelName = exactLevels[index + 1]?.canonicalLevelName ?? null

      return {
        ordinal: index + 1,
        code: descriptor.canonicalLevelCode.toLowerCase(),
        displayName: descriptor.canonicalLevelName,
        shortName: descriptor.canonicalLevelCode,
        normalizedValue: Number((index / (exactLevels.length - 1)).toFixed(4)),
        sortOrder: index,
        genericDescription: descriptor.summary,
        expectedKnowledge: descriptor.levelDimensions.knowledge,
        expectedExecution: descriptor.levelDimensions.execution,
        autonomyDescriptor: descriptor.levelDimensions.autonomy,
        complexityDescriptor: descriptor.levelDimensions.complexity,
        qualityDescriptor: descriptor.levelDimensions.quality,
        collaborationDescriptor: descriptor.levelDimensions.collaboration,
        observableBehaviors: descriptor.typicalSigns,
        positiveExamples: buildPositiveExamples(
          descriptor.canonicalLevelName,
          descriptor.levelDimensions.execution,
          descriptor.levelDimensions.collaboration
        ),
        negativeExamples: buildNegativeExamples(
          descriptor.canonicalLevelName,
          descriptor.levelDimensions.autonomy,
          descriptor.levelDimensions.quality
        ),
        evidenceGuidance: buildEvidenceGuidance(
          descriptor.canonicalLevelName,
          descriptor.typicalSigns
        ),
        ceilingGuidance: buildCeilingGuidance(descriptor.canonicalLevelName, nextLevelName),
        legacyBandCode: descriptor.legacyBandCode,
      }
    }),
  }
}
