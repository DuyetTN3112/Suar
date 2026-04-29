import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Verification methods are authored as a list of built-in and/or custom
 * methods (serialized as newline-delimited text). The original varchar(40)
 * column could not store that contract and caused valid task creation to
 * fail with a PostgreSQL value-too-long error.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE tasks
        ALTER COLUMN verification_method TYPE text;

      ALTER TABLE tasks
        DROP CONSTRAINT IF EXISTS tasks_verification_method_check;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM tasks
          WHERE length(verification_method) > 40
        ) THEN
          RAISE EXCEPTION 'Cannot restore tasks.verification_method to varchar(40): existing values exceed 40 characters';
        END IF;
      END $$;

      ALTER TABLE tasks
        ALTER COLUMN verification_method TYPE varchar(40);

      ALTER TABLE tasks
        ADD CONSTRAINT tasks_verification_method_check
        CHECK (verification_method IN (
          'code_review',
          'automated_test',
          'manual_qa',
          'demo_presentation',
          'manager_approval',
          'peer_review',
          'user_acceptance_test',
          'a_b_test',
          'load_test',
          'security_audit',
          'documentation_review',
          'multi_step'
        ));
    `)
  }
}
