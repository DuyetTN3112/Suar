import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ShowPublishedSkillRubricQuery from '#modules/skills/actions/queries/show_published_skill_rubric_query'
import {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelValue,
} from '#modules/skills/public_contracts/proficiency_level_catalog'
import { buildProficiencyFrameworkDescriptor } from '#modules/skills/public_contracts/proficiency_level_mapping'

function mapCanonicalLevelDisplay(level: {
  code: string
  display_name?: string | null
  short_name?: string | null
}) {
  const option =
    findCanonicalProficiencyLevelOption(level.code) ??
    findCanonicalProficiencyLevelOption(level.display_name) ??
    null

  return {
    code: getCanonicalProficiencyLevelValue(level.code, level.code),
    displayName: option?.shortLabel ?? level.display_name ?? level.code,
    shortName: option?.code ?? level.short_name ?? level.code,
  }
}

@inject()
export default class ShowSkillRubricController {
  constructor(private readonly showSkillRubric: ShowPublishedSkillRubricQuery) {}

  async handle({ params }: HttpContext) {
    const skillId = String(params['skillId'])

    const version = await this.showSkillRubric.executeAndWrap(skillId).then((outcome) => outcome.getValue())

    return {
      data: {
        id: version.id,
        skillId: version.skill_id,
        version: version.version,
        status: version.status,
        effectiveFrom: version.effective_from?.toISO() ?? null,
        effectiveTo: version.effective_to?.toISO() ?? null,
        createdBy: version.created_by,
        changeSummary: version.change_summary,
        frameworkVersion: 'suar-kb-v5',
        levels: version.levels.map((level) => ({
          id: level.id,
          proficiencyLevel: {
            ...mapCanonicalLevelDisplay(level.level),
            id: level.level.id,
            ordinal: level.level.ordinal,
            genericDescription: level.level.generic_description,
            expectedKnowledge: level.level.expected_knowledge,
            expectedExecution: level.level.expected_execution,
            autonomyDescriptor: level.level.autonomy_descriptor,
            complexityDescriptor: level.level.complexity_descriptor,
            qualityDescriptor: level.level.quality_descriptor,
            collaborationDescriptor: level.level.collaboration_descriptor,
            observableBehaviors: level.level.observable_behaviors,
            positiveExamples: level.level.positive_examples,
            negativeExamples: level.level.negative_examples,
            evidenceGuidance: level.level.evidence_guidance,
            ceilingGuidance: level.level.ceiling_guidance,
            frameworkDescriptor: buildProficiencyFrameworkDescriptor(level.level),
          },
          summary: level.summary,
          knowledgeExpectations: level.knowledge_expectations,
          observableBehaviors: level.observable_behaviors,
          independenceExpectations: level.independence_expectations,
          complexityExpectations: level.complexity_expectations,
          impactScopeExpectations: level.impact_scope_expectations,
          positiveExamples: level.positive_examples,
          negativeExamples: level.negative_examples,
          evidenceGuidance: level.evidence_guidance,
          expectedExecution: level.expected_execution,
          autonomyDescriptor: level.autonomy_descriptor,
          complexityDescriptor: level.complexity_descriptor,
          qualityDescriptor: level.quality_descriptor,
          collaborationDescriptor: level.collaboration_descriptor,
          ceilingGuidance: level.ceiling_guidance,
          assessmentDimensions: {
            knowledge: level.knowledge_expectations,
            autonomy: level.independence_expectations,
            complexity: level.complexity_expectations,
            impact: level.impact_scope_expectations,
          },
        })),
        createdAt: version.created_at.toISO(),
        updatedAt: version.updated_at.toISO(),
      },
    }
  }
}
