import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'competency_evidence_fields'

  override async up() {
    if (await this.schema.hasColumn('proficiency_levels', 'expected_knowledge')) {
      return
    }
    // 1. proficiency_levels — add level descriptor fields
    this.schema.alterTable('proficiency_levels', (table) => {
      table.text('expected_knowledge').nullable()
      table.text('expected_execution').nullable()
      table.text('autonomy_descriptor').nullable()
      table.text('complexity_descriptor').nullable()
      table.text('quality_descriptor').nullable()
      table.text('collaboration_descriptor').nullable()
      table.jsonb('observable_behaviors').nullable()
      table.jsonb('positive_examples').nullable()
      table.jsonb('negative_examples').nullable()
      table.text('evidence_guidance').nullable()
      table.text('ceiling_guidance').nullable()
    })

    // 2. skill_rubric_levels — add missing descriptor fields
    this.schema.alterTable('skill_rubric_levels', (table) => {
      table.text('expected_execution').nullable()
      table.text('autonomy_descriptor').nullable()
      table.text('complexity_descriptor').nullable()
      table.text('quality_descriptor').nullable()
      table.text('collaboration_descriptor').nullable()
      table.text('ceiling_guidance').nullable()
    })

    // 3. skill_reviews — add missing review fields
    this.schema.alterTable('skill_reviews', (table) => {
      table.uuid('task_required_skill_id').nullable()
      table.string('reviewer_role', 50).nullable()
      table.string('reviewer_skill_relevance', 50).nullable()
      table.decimal('review_weight', 5, 2).nullable().defaultTo(1.0)
      table.jsonb('flags').nullable()
      table.jsonb('evidence_ids').nullable()
    })

    // 4. user_skills — add profile aggregation fields
    this.schema.alterTable('user_skills', (table) => {
      table.decimal('confidence', 5, 4).nullable()
      table.integer('evidence_count').nullable().defaultTo(0)
      table.integer('high_quality_evidence_count').nullable().defaultTo(0)
      table.timestamp('last_verified_at', { useTz: true }).nullable()
      table.string('trend', 20).nullable()
      table.uuid('self_declared_level_id').nullable()
      table.uuid('reviewed_level_id').nullable()
      table.integer('dispute_pending_count').nullable().defaultTo(0)
      table.boolean('stale_flag').nullable().defaultTo(false)
      table.text('explanation_summary').nullable()
    })

    // 5. review_sessions — add assessment quality fields
    this.schema.alterTable('review_sessions', (table) => {
      table.decimal('confidence', 5, 4).nullable()
      table.decimal('evidence_strength', 5, 4).nullable()
      table.decimal('recency_weight', 5, 4).nullable()
      table.uuid('assessment_ceiling_level_id').nullable()
      table.uuid('rubric_version_id').nullable()
    })

    // 6. tasks — add assessment opportunity fields
    this.schema.alterTable('tasks', (table) => {
      table.string('task_type', 50).nullable()
      table.string('complexity', 20).nullable()
      table.string('impact_scope', 20).nullable()
      table.string('autonomy_expected', 20).nullable()
      table.uuid('minimum_level_id').nullable()
      table.uuid('target_level_id').nullable()
      table.uuid('assessment_ceiling_level_id').nullable()
      table.uuid('rubric_version_id').nullable()
    })

    // 7. task_requirement_version_items — add extra fields
    this.schema.alterTable('task_requirement_version_items', (table) => {
      table.text('requirement_notes').nullable()
    })

    // 8. professional_role_template_skills — add extra fields
    this.schema.alterTable('professional_role_template_skills', (table) => {
      table.text('notes').nullable()
    })

    // 9. review_evidences — add source/author/verification fields
    this.schema.alterTable('review_evidences', (table) => {
      table.string('source', 50).nullable()
      table.uuid('author_id').nullable()
      table.string('linked_skill', 50).nullable()
      table.string('verification_status', 20).nullable()
      table.jsonb('reviewer_references').nullable()
      table.string('dispute_status', 20).nullable()
      table.decimal('confidence_contribution', 5, 4).nullable()
      table.boolean('is_sensitive').nullable().defaultTo(false)
    })
  }

  override async down() {
    if (!(await this.schema.hasColumn('proficiency_levels', 'expected_knowledge'))) {
      return
    }
    // Reverse all changes
    this.schema.alterTable('proficiency_levels', (table) => {
      table.dropColumn('expected_knowledge')
      table.dropColumn('expected_execution')
      table.dropColumn('autonomy_descriptor')
      table.dropColumn('complexity_descriptor')
      table.dropColumn('quality_descriptor')
      table.dropColumn('collaboration_descriptor')
      table.dropColumn('observable_behaviors')
      table.dropColumn('positive_examples')
      table.dropColumn('negative_examples')
      table.dropColumn('evidence_guidance')
      table.dropColumn('ceiling_guidance')
    })

    this.schema.alterTable('skill_rubric_levels', (table) => {
      table.dropColumn('expected_execution')
      table.dropColumn('autonomy_descriptor')
      table.dropColumn('complexity_descriptor')
      table.dropColumn('quality_descriptor')
      table.dropColumn('collaboration_descriptor')
      table.dropColumn('ceiling_guidance')
    })

    this.schema.alterTable('skill_reviews', (table) => {
      table.dropColumn('task_required_skill_id')
      table.dropColumn('reviewer_role')
      table.dropColumn('reviewer_skill_relevance')
      table.dropColumn('review_weight')
      table.dropColumn('flags')
      table.dropColumn('evidence_ids')
    })

    this.schema.alterTable('user_skills', (table) => {
      table.dropColumn('confidence')
      table.dropColumn('evidence_count')
      table.dropColumn('high_quality_evidence_count')
      table.dropColumn('last_verified_at')
      table.dropColumn('trend')
      table.dropColumn('self_declared_level_id')
      table.dropColumn('reviewed_level_id')
      table.dropColumn('dispute_pending_count')
      table.dropColumn('stale_flag')
      table.dropColumn('explanation_summary')
    })

    this.schema.alterTable('review_sessions', (table) => {
      table.dropColumn('confidence')
      table.dropColumn('evidence_strength')
      table.dropColumn('recency_weight')
      table.dropColumn('assessment_ceiling_level_id')
      table.dropColumn('rubric_version_id')
    })

    this.schema.alterTable('tasks', (table) => {
      table.dropColumn('task_type')
      table.dropColumn('complexity')
      table.dropColumn('impact_scope')
      table.dropColumn('autonomy_expected')
      table.dropColumn('minimum_level_id')
      table.dropColumn('target_level_id')
      table.dropColumn('assessment_ceiling_level_id')
      table.dropColumn('rubric_version_id')
    })

    this.schema.alterTable('task_requirement_version_items', (table) => {
      table.dropColumn('requirement_notes')
    })

    this.schema.alterTable('professional_role_template_skills', (table) => {
      table.dropColumn('notes')
    })

    this.schema.alterTable('review_evidences', (table) => {
      table.dropColumn('source')
      table.dropColumn('author_id')
      table.dropColumn('linked_skill')
      table.dropColumn('verification_status')
      table.dropColumn('reviewer_references')
      table.dropColumn('dispute_status')
      table.dropColumn('confidence_contribution')
      table.dropColumn('is_sensitive')
    })
  }
}
