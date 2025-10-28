import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

test.group('Integration | Competency schema repair audit', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  interface ColumnNameRow {
    column_name: string
  }

  test('runtime schema exposes competency evidence columns after repair migration', async ({
    assert,
  }) => {
    const proficiencyColumnsResult = await db
      .from('information_schema.columns')
      .where('table_schema', 'public')
      .where('table_name', 'proficiency_levels')
      .whereIn('column_name', [
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
        'ceiling_guidance',
      ])
      .select('column_name')
    const proficiencyColumns = proficiencyColumnsResult as ColumnNameRow[]

    const rubricColumnsResult = await db
      .from('information_schema.columns')
      .where('table_schema', 'public')
      .where('table_name', 'skill_rubric_levels')
      .whereIn('column_name', [
        'expected_execution',
        'autonomy_descriptor',
        'complexity_descriptor',
        'quality_descriptor',
        'collaboration_descriptor',
        'ceiling_guidance',
      ])
      .select('column_name')
    const rubricColumns = rubricColumnsResult as ColumnNameRow[]

    const reviewColumnsResult = await db
      .from('information_schema.columns')
      .where('table_schema', 'public')
      .where('table_name', 'review_sessions')
      .whereIn('column_name', [
        'confidence',
        'evidence_strength',
        'recency_weight',
        'assessment_ceiling_level_id',
        'rubric_version_id',
      ])
      .select('column_name')
    const reviewColumns = reviewColumnsResult as ColumnNameRow[]

    assert.sameMembers(
      proficiencyColumns.map((row) => row.column_name),
      [
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
        'ceiling_guidance',
      ]
    )

    assert.sameMembers(
      rubricColumns.map((row) => row.column_name),
      [
        'expected_execution',
        'autonomy_descriptor',
        'complexity_descriptor',
        'quality_descriptor',
        'collaboration_descriptor',
        'ceiling_guidance',
      ]
    )

    assert.sameMembers(
      reviewColumns.map((row) => row.column_name),
      [
        'confidence',
        'evidence_strength',
        'recency_weight',
        'assessment_ceiling_level_id',
        'rubric_version_id',
      ]
    )
  })
})
