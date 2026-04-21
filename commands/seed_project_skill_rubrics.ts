import { randomUUID } from 'node:crypto'

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

type ProjectSkillRow = {
  skill_id: string
  skill_name: string
  skill_code: string
}

type RubricVersionRow = { id: string; version: number }

type ProficiencyLevelRow = {
  id: string
  code: string
  expected_knowledge: unknown
  expected_execution: string | null
  autonomy_descriptor: string | null
  complexity_descriptor: string | null
  quality_descriptor: string | null
  collaboration_descriptor: string | null
  observable_behaviors: unknown
  positive_examples: unknown
  negative_examples: unknown
  evidence_guidance: string | null
  ceiling_guidance: string | null
}

function jsonColumn(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      JSON.parse(value)
      return value
    } catch {
      return JSON.stringify([value])
    }
  }
  return JSON.stringify(value)
}

export default class SeedProjectSkillRubrics extends BaseCommand {
  static override commandName = 'seed:project-skill-rubrics'
  static override description =
    'Create published rubrics and link them to active Project Skills for local task testing'
  static override options: CommandOptions = { startApp: true }

  async run() {
    const trx = await db.transaction()
    try {
      const projectSkills = (await trx
        .from('project_skills as ps')
        .join('skills as s', 's.id', 'ps.skill_id')
        .where('ps.is_active', true)
        .select('ps.skill_id', 's.skill_name', 's.skill_code')
        .distinct('ps.skill_id', 's.skill_name', 's.skill_code')) as ProjectSkillRow[]

      const levels = (await trx
        .from('proficiency_levels')
        .select(
          'id',
          'code',
          'expected_knowledge',
          'expected_execution',
          'autonomy_descriptor',
          'complexity_descriptor',
          'quality_descriptor',
          'collaboration_descriptor',
          'observable_behaviors',
          'positive_examples',
          'negative_examples',
          'evidence_guidance',
          'ceiling_guidance'
        )
        .orderBy('ordinal', 'asc')) as ProficiencyLevelRow[]

      let createdRubrics = 0
      let linkedProjectSkills = 0

      for (const skill of projectSkills) {
        const existing = (await trx
          .from('skill_rubric_versions')
          .where('skill_id', skill.skill_id)
          .where('status', 'published')
          .orderBy('version', 'desc')
          .select('id', 'version')
          .first()) as RubricVersionRow | undefined

        let rubricVersionId = existing?.id
        if (!rubricVersionId) {
          rubricVersionId = randomUUID()
          await trx.table('skill_rubric_versions').insert({
            id: rubricVersionId,
            skill_id: skill.skill_id,
            version: 1,
            status: 'published',
            effective_from: new Date().toISOString(),
            effective_to: null,
            created_by: null,
            change_summary: `Seed published rubric for ${skill.skill_name}`,
          })
          createdRubrics += 1
        }

        for (const level of levels) {
          const exists = (await trx
            .from('skill_rubric_levels')
            .where('rubric_version_id', rubricVersionId)
            .where('proficiency_level_id', level.id)
            .first()) as { id: string } | undefined
          if (exists) continue

          await trx.table('skill_rubric_levels').insert({
            id: randomUUID(),
            rubric_version_id: rubricVersionId,
            proficiency_level_id: level.id,
            summary: `${skill.skill_name} level ${level.code} expectations.`,
            knowledge_expectations: jsonColumn(level.expected_knowledge),
            observable_behaviors: jsonColumn(level.observable_behaviors),
            independence_expectations: level.autonomy_descriptor,
            complexity_expectations: level.complexity_descriptor,
            impact_scope_expectations: level.quality_descriptor,
            positive_examples: jsonColumn(level.positive_examples),
            negative_examples: jsonColumn(level.negative_examples),
            evidence_guidance:
              level.evidence_guidance ?? `Verify ${skill.skill_name} with task evidence.`,
            expected_execution: level.expected_execution,
            autonomy_descriptor: level.autonomy_descriptor,
            complexity_descriptor: level.complexity_descriptor,
            quality_descriptor: level.quality_descriptor,
            collaboration_descriptor: level.collaboration_descriptor,
            ceiling_guidance: level.ceiling_guidance,
          })
        }

        const updated = await trx
          .from('project_skills')
          .where('skill_id', skill.skill_id)
          .whereNull('rubric_version_id')
          .update({ rubric_version_id: rubricVersionId })
        linkedProjectSkills += Number(updated)
      }

      await trx.commit()
      this.logger.success(
        `Seeded ${createdRubrics} published rubrics and linked ${linkedProjectSkills} Project Skills across ${projectSkills.length} skills.`
      )
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
