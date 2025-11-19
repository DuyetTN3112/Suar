import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ADD COLUMN IF NOT EXISTS source_type varchar(64) DEFAULT 'review_dispute' NOT NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ADD COLUMN IF NOT EXISTS source_id uuid
    `)
    await this.db.rawQuery(`
      UPDATE ai_dispute_evaluations
      SET source_id = dispute_id
      WHERE source_id IS NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ALTER COLUMN case_file_id DROP NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_ai_dispute_evaluations_source
      ON ai_dispute_evaluations (source_type, source_id, created_at DESC)
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      DROP CONSTRAINT IF EXISTS sprint_review_disputes_status_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      ADD CONSTRAINT sprint_review_disputes_status_check
      CHECK (status = ANY (ARRAY[
        'pending',
        'collecting_evidence',
        'admin_reviewing',
        'ai_reviewing',
        'resolved',
        'rejected',
        'cancelled'
      ]))
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      DROP CONSTRAINT IF EXISTS sprint_review_disputes_status_check
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS sprint_review_disputes
      ADD CONSTRAINT sprint_review_disputes_status_check
      CHECK (status = ANY (ARRAY[
        'pending',
        'collecting_evidence',
        'admin_reviewing',
        'resolved',
        'rejected',
        'cancelled'
      ]))
    `)
    await this.db.rawQuery(`
      DROP INDEX IF EXISTS idx_ai_dispute_evaluations_source
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      ALTER COLUMN case_file_id SET NOT NULL
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP COLUMN IF EXISTS source_id
    `)
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS ai_dispute_evaluations
      DROP COLUMN IF EXISTS source_type
    `)
  }
}
