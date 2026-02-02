import { BaseSchema } from '@adonisjs/lucid/schema'

const ARCHIVE_COMMENT =
  'retired:user_activity; canonical-auth-evidence:audit_events; managed-by:20260729070000_canonicalize_auth_session_audit_evidence'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.audit_events') IS NULL THEN
          RAISE EXCEPTION 'audit_events must exist before canonicalizing auth evidence';
        END IF;

        ALTER TABLE public.audit_events
          ADD COLUMN IF NOT EXISTS source_occurred_at timestamptz;
        COMMENT ON COLUMN public.audit_events.source_occurred_at IS
          'Producer-observed event time; audit_events.occurred_at remains the monotonic database record/hash-chain order.';

        IF to_regclass('public.user_activity_events') IS NOT NULL
          AND to_regclass('public.retired_user_activity_events') IS NOT NULL
        THEN
          RAISE EXCEPTION 'both live and retired user-activity tables exist; refusing ambiguous retirement';
        END IF;
        IF to_regclass('public.user_activity_events') IS NULL
          AND to_regclass('public.retired_user_activity_events') IS NULL
        THEN
          RAISE EXCEPTION 'user_activity_events is missing; retirement provenance cannot be verified';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      UPDATE public.audit_events AS audit
      SET source_occurred_at = activity.created_at
      FROM public.user_activity_events AS activity
      WHERE audit.source_occurred_at IS NULL
        AND audit.event_family = 'auth.session'
        AND audit.correlation_key = activity.action_data->>'event_id'
        AND audit.user_id = activity.user_id
        AND audit.action = activity.action_type
    `)

    await this.db.rawQuery(`
      UPDATE public.audit_events AS audit
      SET source_occurred_at = receipt.occurred_at
      FROM public.auth_session_event_receipts AS receipt
      WHERE audit.source_occurred_at IS NULL
        AND audit.event_family = 'auth.session'
        AND audit.correlation_key = receipt.event_id::text
        AND audit.user_id = receipt.user_id
        AND audit.action = receipt.action
    `)

    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.user_activity_events') IS NOT NULL THEN
          ALTER TABLE public.user_activity_events
            RENAME TO retired_user_activity_events;
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      ALTER INDEX IF EXISTS public.idx_user_activity_events_user_created
        RENAME TO idx_retired_user_activity_events_user_created
    `)
    await this.db.rawQuery(`
      ALTER INDEX IF EXISTS public.idx_user_activity_events_user_action
        RENAME TO idx_retired_user_activity_events_user_action
    `)
    await this.db.rawQuery(`
      COMMENT ON TABLE public.retired_user_activity_events IS '${ARCHIVE_COMMENT}'
    `)
    await this.db.rawQuery(`
      CREATE OR REPLACE FUNCTION public.reject_retired_user_activity_mutation()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        RAISE EXCEPTION
          'retired_user_activity_events is a read-only archive; audit_events is canonical';
      END
      $function$
    `)
    await this.db.rawQuery(`
      DROP TRIGGER IF EXISTS retired_user_activity_events_read_only
        ON public.retired_user_activity_events
    `)
    await this.db.rawQuery(`
      CREATE TRIGGER retired_user_activity_events_read_only
      BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE
      ON public.retired_user_activity_events
      FOR EACH STATEMENT
      EXECUTE FUNCTION public.reject_retired_user_activity_mutation()
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM public.audit_events
          WHERE schema_version >= 3
            AND source_occurred_at IS NOT NULL
        ) THEN
          RAISE EXCEPTION
            'refusing rollback while schema-v3 audit evidence depends on source_occurred_at';
        END IF;

        IF to_regclass('public.user_activity_events') IS NOT NULL
          AND to_regclass('public.retired_user_activity_events') IS NOT NULL
        THEN
          RAISE EXCEPTION 'both live and retired user-activity tables exist; refusing ambiguous rollback';
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      DROP TRIGGER IF EXISTS retired_user_activity_events_read_only
        ON public.retired_user_activity_events
    `)
    await this.db.rawQuery(`
      DROP FUNCTION IF EXISTS public.reject_retired_user_activity_mutation()
    `)
    await this.db.rawQuery(`
      ALTER INDEX IF EXISTS public.idx_retired_user_activity_events_user_created
        RENAME TO idx_user_activity_events_user_created
    `)
    await this.db.rawQuery(`
      ALTER INDEX IF EXISTS public.idx_retired_user_activity_events_user_action
        RENAME TO idx_user_activity_events_user_action
    `)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.retired_user_activity_events') IS NOT NULL THEN
          ALTER TABLE public.retired_user_activity_events
            RENAME TO user_activity_events;
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE public.audit_events
        DROP COLUMN IF EXISTS source_occurred_at
    `)
  }
}
