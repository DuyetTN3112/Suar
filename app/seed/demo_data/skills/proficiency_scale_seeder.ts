import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from '../seed_runtime.js'
import { findRow } from '../seed_utils.js'

import { getSystemDefaultProficiencyScaleSeed } from '#modules/skills/infra/adapters/rubric-and-proficiency/system_default_proficiency_scale'

export interface ProficiencyLevelSeedRow {
  id: string
  code: string
  ordinal: number
  expected_knowledge: string | null
  expected_execution: string | null
  autonomy_descriptor: string | null
  complexity_descriptor: string | null
  quality_descriptor: string | null
  collaboration_descriptor: string | null
  observable_behaviors: string[] | null
  positive_examples: string[] | null
  negative_examples: string[] | null
  evidence_guidance: string | null
  ceiling_guidance: string | null
}

export async function seedProficiencyScales(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<string> {
  const scaleSeed = getSystemDefaultProficiencyScaleSeed()
  const scaleCode = scaleSeed.code
  const existingScale = await findRow(trx, 'proficiency_scales', { code: scaleCode })
  const scaleId = existingScale?.id ?? runtime.uuid()

  const scalePayload = {
    code: scaleCode,
    name: scaleSeed.name,
    version: scaleSeed.version,
    is_active: scaleSeed.isActive,
    created_at: runtime.isoDaysAgo(90),
    updated_at: runtime.isoDaysAgo(1),
  }

  if (existingScale) {
    await trx.from('proficiency_scales').where('id', scaleId).update(scalePayload)
  } else {
    await trx
      .insertQuery()
      .table('proficiency_scales')
      .insert({ id: scaleId, ...scalePayload })
  }

  for (const levelSpec of scaleSeed.levels) {
    const {
      ordinal,
      code,
      displayName,
      shortName,
      normalizedValue,
      sortOrder,
      genericDescription,
      expectedKnowledge,
      expectedExecution,
      autonomyDescriptor,
      complexityDescriptor,
      qualityDescriptor,
      collaborationDescriptor,
      observableBehaviors,
      positiveExamples,
      negativeExamples,
      evidenceGuidance,
      ceilingGuidance,
    } = levelSpec
    const existingLevel = await findRow(trx, 'proficiency_levels', { scale_id: scaleId, ordinal })
    const levelId = existingLevel?.id ?? runtime.uuid()
    const levelPayload = {
      scale_id: scaleId,
      ordinal,
      code,
      display_name: displayName,
      short_name: shortName,
      normalized_value: normalizedValue,
      generic_description: genericDescription,
      sort_order: sortOrder,
      expected_knowledge: expectedKnowledge,
      expected_execution: expectedExecution,
      autonomy_descriptor: autonomyDescriptor,
      complexity_descriptor: complexityDescriptor,
      quality_descriptor: qualityDescriptor,
      collaboration_descriptor: collaborationDescriptor,
      observable_behaviors: JSON.stringify(observableBehaviors),
      positive_examples: JSON.stringify(positiveExamples),
      negative_examples: JSON.stringify(negativeExamples),
      evidence_guidance: evidenceGuidance,
      ceiling_guidance: ceilingGuidance,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existingLevel) {
      await trx.from('proficiency_levels').where('id', levelId).update(levelPayload)
    } else {
      await trx
        .insertQuery()
        .table('proficiency_levels')
        .insert({ id: levelId, ...levelPayload })
    }
  }

  return scaleId
}
