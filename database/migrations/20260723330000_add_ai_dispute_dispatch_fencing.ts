import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260723330000_add_ai_dispute_dispatch_fencing'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      DO $$
      DECLARE
        dispatch_token_attnum smallint;
      BEGIN
        IF to_regclass('public.ai_dispute_evaluations') IS NULL THEN
          RAISE EXCEPTION
            'ai_dispute_evaluations must exist before dispatch fencing is installed';
        END IF;

        SELECT attnum
        INTO dispatch_token_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.ai_dispute_evaluations'::regclass
          AND attname = 'trigger_dispatch_token'
          AND NOT attisdropped;

        IF dispatch_token_attnum IS NULL THEN
          ALTER TABLE public.ai_dispute_evaluations
            ADD COLUMN trigger_dispatch_token uuid;
          COMMENT ON COLUMN public.ai_dispute_evaluations.trigger_dispatch_token
            IS '${OWNER_COMMENT}';
        ELSIF col_description(
          'public.ai_dispute_evaluations'::regclass,
          dispatch_token_attnum
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'trigger_dispatch_token exists but is not owned by this migration';
        END IF;
      END
      $$;
    `)

    await this.db.rawQuery(`
      UPDATE ai_dispute_evaluations
      SET trigger_dispatch_token = NULL
      WHERE trigger_state <> 'dispatching'
        AND trigger_dispatch_token IS NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $$
      DECLARE
        dispatch_token_attnum smallint;
      BEGIN
        IF to_regclass('public.ai_dispute_evaluations') IS NULL THEN
          RETURN;
        END IF;

        SELECT attnum
        INTO dispatch_token_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.ai_dispute_evaluations'::regclass
          AND attname = 'trigger_dispatch_token'
          AND NOT attisdropped;

        IF dispatch_token_attnum IS NOT NULL
          AND col_description(
            'public.ai_dispute_evaluations'::regclass,
            dispatch_token_attnum
          ) = '${OWNER_COMMENT}'
        THEN
          ALTER TABLE public.ai_dispute_evaluations
            DROP COLUMN trigger_dispatch_token;
        END IF;
      END
      $$;
    `)
  }
}
