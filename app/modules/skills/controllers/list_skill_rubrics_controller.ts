import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ListSkillRubricVersionsQuery from '#modules/skills/actions/queries/list_skill_rubric_versions_query'
import {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelValue,
} from '#modules/skills/public_contracts/proficiency_level_catalog'

function mapCanonicalLevelDisplay(level: { code: string; display_name?: string | null }) {
  const option =
    findCanonicalProficiencyLevelOption(level.code) ??
    findCanonicalProficiencyLevelOption(level.display_name) ??
    null

  return {
    code: getCanonicalProficiencyLevelValue(level.code, level.code),
    display_name: option?.shortLabel ?? level.display_name ?? level.code,
  }
}

@inject()
export default class ListSkillRubricsController {
  constructor(private readonly listSkillRubrics: ListSkillRubricVersionsQuery) {}

  async handle({ params }: HttpContext) {
    const skillId = String(params['skillId'])

    const versions = await this.listSkillRubrics.execute(skillId)

    return {
      data: versions.map((version) => ({
        id: version.id,
        skill_id: version.skill_id,
        version: version.version,
        status: version.status,
        effective_from: version.effective_from?.toISO() ?? null,
        effective_to: version.effective_to?.toISO() ?? null,
        created_by: version.created_by,
        change_summary: version.change_summary,
        levels: version.levels.map((lvl) => ({
          id: lvl.id,
          proficiency_level: {
            ...mapCanonicalLevelDisplay(lvl.level),
            id: lvl.level.id,
            ordinal: lvl.level.ordinal,
          },
          summary: lvl.summary,
          knowledge_expectations: lvl.knowledge_expectations,
          observable_behaviors: lvl.observable_behaviors,
          independence_expectations: lvl.independence_expectations,
          complexity_expectations: lvl.complexity_expectations,
          impact_scope_expectations: lvl.impact_scope_expectations,
          positive_examples: lvl.positive_examples,
          negative_examples: lvl.negative_examples,
          evidence_guidance: lvl.evidence_guidance,
        })),
        created_at: version.created_at.toISO(),
        updated_at: version.updated_at.toISO(),
      })),
    }
  }
}
