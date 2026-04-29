import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE task_completion_evidence_manifest
        ADD COLUMN IF NOT EXISTS evidence_requirement_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
        ADD COLUMN IF NOT EXISTS related_deliverable_ids JSONB NOT NULL DEFAULT '[]'::JSONB;

      UPDATE task_completion_evidence_manifest
      SET related_deliverable_ids = jsonb_build_array(related_deliverable_id)
      WHERE related_deliverable_id IS NOT NULL
        AND jsonb_array_length(related_deliverable_ids) = 0;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_task_completion_evidence_requirement_ids_array'
        ) THEN
          ALTER TABLE task_completion_evidence_manifest
            ADD CONSTRAINT chk_task_completion_evidence_requirement_ids_array
            CHECK (jsonb_typeof(evidence_requirement_ids) = 'array');
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_task_completion_evidence_deliverable_ids_array'
        ) THEN
          ALTER TABLE task_completion_evidence_manifest
            ADD CONSTRAINT chk_task_completion_evidence_deliverable_ids_array
            CHECK (jsonb_typeof(related_deliverable_ids) = 'array');
        END IF;
      END $$;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE task_completion_evidence_manifest
        DROP CONSTRAINT IF EXISTS chk_task_completion_evidence_requirement_ids_array,
        DROP CONSTRAINT IF EXISTS chk_task_completion_evidence_deliverable_ids_array,
        DROP COLUMN IF EXISTS evidence_requirement_ids,
        DROP COLUMN IF EXISTS related_deliverable_ids
    `)
  }
}
