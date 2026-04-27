import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS event_id uuid,
        ADD COLUMN IF NOT EXISTS event_fingerprint char(64),
        ADD COLUMN IF NOT EXISTS occurred_at timestamptz,
        ADD COLUMN IF NOT EXISTS correlation_id text,
        ADD COLUMN IF NOT EXISTS actor_type text,
        ADD COLUMN IF NOT EXISTS actor_id text,
        ADD COLUMN IF NOT EXISTS subject_type text,
        ADD COLUMN IF NOT EXISTS subject_id text,
        ADD COLUMN IF NOT EXISTS schema_version integer DEFAULT 1,
        ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'user',
        ADD COLUMN IF NOT EXISTS scope_id text,
        ADD COLUMN IF NOT EXISTS organization_id uuid,
        ADD COLUMN IF NOT EXISTS category text DEFAULT 'legacy',
        ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
        ADD COLUMN IF NOT EXISTS template_key text DEFAULT 'notifications.legacy',
        ADD COLUMN IF NOT EXISTS template_version integer DEFAULT 1,
        ADD COLUMN IF NOT EXISTS locale text DEFAULT 'vi',
        ADD COLUMN IF NOT EXISTS parameters jsonb DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS action jsonb,
        ADD COLUMN IF NOT EXISTS revision bigint DEFAULT 1,
        ADD COLUMN IF NOT EXISTS dedupe_key varchar(255)
    `)

    await this.db.rawQuery(`
      WITH deterministic AS (
        SELECT
          id,
          md5('suar:notification:event:' || id::text) AS event_hash,
          md5(
            concat_ws(
              '|',
              id::text,
              user_id::text,
              COALESCE(type, ''),
              COALESCE(title, ''),
              COALESCE(message, ''),
              COALESCE(related_entity_type, ''),
              COALESCE(related_entity_id, ''),
              COALESCE(created_at::text, '')
            )
          ) AS fingerprint_a,
          md5(
            'suar:notification:fingerprint:' ||
            concat_ws(
              '|',
              id::text,
              user_id::text,
              COALESCE(type, ''),
              COALESCE(title, ''),
              COALESCE(message, ''),
              COALESCE(created_at::text, '')
            )
          ) AS fingerprint_b
        FROM notifications
      )
      UPDATE notifications AS notification
      SET
        event_id = COALESCE(
          notification.event_id,
          (
            substr(deterministic.event_hash, 1, 8) || '-' ||
            substr(deterministic.event_hash, 9, 4) || '-5' ||
            substr(deterministic.event_hash, 14, 3) || '-a' ||
            substr(deterministic.event_hash, 18, 3) || '-' ||
            substr(deterministic.event_hash, 21, 12)
          )::uuid
        ),
        event_fingerprint = COALESCE(
          notification.event_fingerprint,
          deterministic.fingerprint_a || deterministic.fingerprint_b
        ),
        occurred_at = COALESCE(notification.occurred_at, notification.created_at, now()),
        schema_version = COALESCE(notification.schema_version, 1),
        scope_type = COALESCE(notification.scope_type, 'user'),
        scope_id = COALESCE(notification.scope_id, notification.user_id::text),
        category = CASE
          WHEN notification.category IS NOT NULL AND notification.category <> 'legacy'
            THEN notification.category
          WHEN notification.type LIKE 'organization_%' OR notification.type = 'organization'
            THEN 'organization'
          WHEN notification.type LIKE 'project_%'
            THEN 'project'
          WHEN notification.type LIKE 'task_%'
            OR notification.type LIKE 'assignment_%'
            OR notification.type IN ('task_application', 'task_application_review')
            THEN 'task'
          WHEN notification.type LIKE 'review_%'
            OR notification.type LIKE 'reverse_review_%'
            OR notification.type = 'review'
            THEN 'review'
          ELSE 'system'
        END,
        priority = COALESCE(notification.priority, 'normal'),
        template_key = CASE
          WHEN notification.template_key IS NULL
            OR notification.template_key = 'notifications.legacy'
            THEN 'notifications.' || COALESCE(notification.type, 'legacy')
          ELSE notification.template_key
        END,
        template_version = COALESCE(notification.template_version, 1),
        locale = COALESCE(notification.locale, 'vi'),
        parameters = COALESCE(notification.parameters, '{}'::jsonb),
        revision = COALESCE(notification.revision, 1),
        subject_type = COALESCE(notification.subject_type, notification.related_entity_type),
        subject_id = COALESCE(notification.subject_id, notification.related_entity_id),
        read_at = CASE
          WHEN notification.is_read
            THEN COALESCE(notification.read_at, notification.updated_at, notification.created_at, now())
          ELSE NULL
        END
      FROM deterministic
      WHERE deterministic.id = notification.id
    `)

    await this.db.rawQuery(`
      ALTER TABLE notifications
        ALTER COLUMN event_id SET DEFAULT gen_random_uuid(),
        ALTER COLUMN event_id SET NOT NULL,
        ALTER COLUMN event_fingerprint
          SET DEFAULT (md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text)),
        ALTER COLUMN event_fingerprint SET NOT NULL,
        ALTER COLUMN occurred_at SET DEFAULT now(),
        ALTER COLUMN occurred_at SET NOT NULL,
        ALTER COLUMN schema_version SET NOT NULL,
        ALTER COLUMN scope_type SET NOT NULL,
        ALTER COLUMN category SET NOT NULL,
        ALTER COLUMN priority SET NOT NULL,
        ALTER COLUMN template_key SET NOT NULL,
        ALTER COLUMN template_version SET NOT NULL,
        ALTER COLUMN locale SET NOT NULL,
        ALTER COLUMN revision SET NOT NULL
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_recipient_states (
        recipient_id uuid PRIMARY KEY,
        unread_count bigint NOT NULL DEFAULT 0,
        revision bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_recipient_states_unread_count_check CHECK (unread_count >= 0),
        CONSTRAINT notification_recipient_states_revision_check CHECK (revision >= 0),
        CONSTRAINT notification_recipient_states_user_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `)

    await this.db.rawQuery(`
      INSERT INTO notification_recipient_states (
        recipient_id,
        unread_count,
        revision,
        created_at,
        updated_at
      )
      SELECT
        user_id,
        COUNT(*) FILTER (WHERE is_read = false),
        1,
        MIN(created_at),
        now()
      FROM notifications
      GROUP BY user_id
      ON CONFLICT (recipient_id) DO UPDATE
      SET
        unread_count = EXCLUDED.unread_count,
        revision = GREATEST(notification_recipient_states.revision, EXCLUDED.revision),
        updated_at = now()
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_acceptance_ledger (
        event_id uuid NOT NULL,
        recipient_id uuid NOT NULL,
        event_fingerprint char(64) NOT NULL,
        notification_id uuid NOT NULL,
        type text NOT NULL,
        dedupe_key varchar(255),
        occurred_at timestamptz NOT NULL,
        terminal_state text NOT NULL DEFAULT 'active',
        accepted_at timestamptz NOT NULL DEFAULT now(),
        terminal_at timestamptz,
        PRIMARY KEY (event_id, recipient_id),
        CONSTRAINT notification_acceptance_ledger_terminal_state_check
          CHECK (terminal_state IN ('active', 'deleted', 'purged')),
        CONSTRAINT notification_acceptance_ledger_fingerprint_check
          CHECK (event_fingerprint ~ '^[0-9a-f]{64}$'),
        CONSTRAINT notification_acceptance_ledger_user_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `)

    await this.db.rawQuery(`
      INSERT INTO notification_acceptance_ledger (
        event_id,
        recipient_id,
        event_fingerprint,
        notification_id,
        type,
        dedupe_key,
        occurred_at,
        terminal_state,
        accepted_at
      )
      SELECT
        event_id,
        user_id,
        event_fingerprint,
        id,
        type,
        dedupe_key,
        occurred_at,
        'active',
        COALESCE(created_at, now())
      FROM notifications
      ON CONFLICT (event_id, recipient_id) DO NOTHING
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_tombstones (
        notification_id uuid PRIMARY KEY,
        recipient_id uuid NOT NULL,
        final_revision bigint NOT NULL,
        deleted_at timestamptz NOT NULL,
        purge_after timestamptz NOT NULL,
        CONSTRAINT notification_tombstones_revision_check CHECK (final_revision >= 1),
        CONSTRAINT notification_tombstones_purge_after_check CHECK (purge_after > deleted_at),
        CONSTRAINT notification_tombstones_user_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
        notification_id uuid,
        operation_id uuid NOT NULL,
        source_event_id uuid NOT NULL,
        event_kind text NOT NULL,
        revision bigint NOT NULL,
        projection_revision bigint NOT NULL,
        destination text NOT NULL,
        partition_key text NOT NULL,
        recipient_id uuid NOT NULL,
        recipient_state_revision bigint NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending',
        available_at timestamptz NOT NULL DEFAULT now(),
        attempt_count integer NOT NULL DEFAULT 0,
        locked_by text,
        locked_until timestamptz,
        lease_token uuid,
        processed_at timestamptz,
        dead_lettered_at timestamptz,
        last_error_class text,
        last_error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_outbox_destination_check
          CHECK (destination IN ('feed_search', 'unread_cache')),
        CONSTRAINT notification_outbox_status_check
          CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter')),
        CONSTRAINT notification_outbox_revision_check
          CHECK (revision >= 1 AND projection_revision >= 1 AND recipient_state_revision >= 1),
        CONSTRAINT notification_outbox_attempt_count_check CHECK (attempt_count >= 0),
        CONSTRAINT notification_outbox_payload_size_check
          CHECK (octet_length(payload::text) <= 16384),
        CONSTRAINT notification_outbox_user_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `)

    await this.db.rawQuery(`
      INSERT INTO notification_outbox (
        notification_id,
        operation_id,
        source_event_id,
        event_kind,
        revision,
        projection_revision,
        destination,
        partition_key,
        recipient_id,
        recipient_state_revision,
        payload
      )
      SELECT
        notification.id,
        gen_random_uuid(),
        notification.event_id,
        'notification_upsert',
        notification.revision,
        notification.revision,
        'feed_search',
        notification.id::text,
        notification.user_id,
        recipient_state.revision,
        jsonb_build_object(
          'notificationId', notification.id,
          'recipientId', notification.user_id,
          'revision', notification.revision
        )
      FROM notifications AS notification
      JOIN notification_recipient_states AS recipient_state
        ON recipient_state.recipient_id = notification.user_id
      ON CONFLICT DO NOTHING
    `)

    await this.db.rawQuery(`
      INSERT INTO notification_outbox (
        notification_id,
        operation_id,
        source_event_id,
        event_kind,
        revision,
        projection_revision,
        destination,
        partition_key,
        recipient_id,
        recipient_state_revision,
        payload
      )
      SELECT
        NULL,
        gen_random_uuid(),
        gen_random_uuid(),
        'unread_absolute',
        recipient_state.revision,
        recipient_state.revision,
        'unread_cache',
        recipient_state.recipient_id::text,
        recipient_state.recipient_id,
        recipient_state.revision,
        jsonb_build_object(
          'recipientId', recipient_state.recipient_id,
          'count', recipient_state.unread_count,
          'revision', recipient_state.revision
        )
      FROM notification_recipient_states AS recipient_state
      ON CONFLICT DO NOTHING
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_projection_targets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        target_key text NOT NULL UNIQUE,
        physical_index text NOT NULL UNIQUE,
        status text NOT NULL,
        active_from_sequence bigint NOT NULL DEFAULT 0,
        required_until timestamptz,
        checkpoint_sequence bigint NOT NULL DEFAULT 0,
        reconciliation_status text NOT NULL DEFAULT 'pending',
        reconciled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_projection_targets_status_check
          CHECK (status IN ('building', 'primary', 'rollback', 'retired')),
        CONSTRAINT notification_projection_targets_reconciliation_check
          CHECK (reconciliation_status IN ('pending', 'running', 'passed', 'failed')),
        CONSTRAINT notification_projection_targets_sequence_check
          CHECK (active_from_sequence >= 0 AND checkpoint_sequence >= 0)
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_projection_deliveries (
        outbox_id uuid NOT NULL,
        target_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        attempt_count integer NOT NULL DEFAULT 0,
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_by text,
        locked_until timestamptz,
        lease_token uuid,
        applied_revision bigint,
        processed_at timestamptz,
        last_error_class text,
        last_error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (outbox_id, target_id),
        CONSTRAINT notification_projection_deliveries_outbox_fk
          FOREIGN KEY (outbox_id) REFERENCES notification_outbox(id) ON DELETE CASCADE,
        CONSTRAINT notification_projection_deliveries_target_fk
          FOREIGN KEY (target_id) REFERENCES notification_projection_targets(id) ON DELETE RESTRICT,
        CONSTRAINT notification_projection_deliveries_status_check
          CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter')),
        CONSTRAINT notification_projection_deliveries_attempt_check
          CHECK (attempt_count >= 0),
        CONSTRAINT notification_projection_deliveries_revision_check
          CHECK (applied_revision IS NULL OR applied_revision >= 1)
      )
    `)

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
        notification_event_recipient_unique
        ON notifications (event_id, user_id)
    `)
    await this.db.rawQuery(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
        notification_dedupe_unique
        ON notifications (user_id, type, dedupe_key)
        WHERE dedupe_key IS NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
        notification_acceptance_dedupe_unique
        ON notification_acceptance_ledger (recipient_id, type, dedupe_key)
        WHERE dedupe_key IS NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_projection_unique
        ON notification_outbox (destination, partition_key, projection_revision)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_claim_idx
        ON notification_outbox (destination, available_at, sequence)
        WHERE status = 'pending'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_lease_idx
        ON notification_outbox (locked_until, sequence)
        WHERE status = 'leased'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_outbox_recipient_idx
        ON notification_outbox (recipient_id, sequence DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_tombstones_purge_idx
        ON notification_tombstones (purge_after)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS
        notification_projection_deliveries_claim_idx
        ON notification_projection_deliveries (available_at, outbox_id, target_id)
        WHERE status = 'pending'
    `)

    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_revision_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_revision_check
            CHECK (revision >= 1) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_schema_version_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_schema_version_check
            CHECK (schema_version >= 1) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_template_version_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_template_version_check
            CHECK (template_version >= 1) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_read_state_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_read_state_check
            CHECK (
              (is_read = false AND read_at IS NULL)
              OR (is_read = true AND read_at IS NOT NULL)
            ) NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_event_fingerprint_check'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_event_fingerprint_check
            CHECK (event_fingerprint ~ '^[0-9a-f]{64}$') NOT VALID;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notifications_user_fk'
        ) THEN
          ALTER TABLE notifications
            ADD CONSTRAINT notifications_user_fk
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE RESTRICT NOT VALID;
        END IF;
      END
      $$
    `)

    await this.db.rawQuery('ALTER TABLE notifications VALIDATE CONSTRAINT notifications_revision_check')
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_schema_version_check'
    )
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_template_version_check'
    )
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_read_state_check'
    )
    await this.db.rawQuery(
      'ALTER TABLE notifications VALIDATE CONSTRAINT notifications_event_fingerprint_check'
    )
    await this.db.rawQuery('ALTER TABLE notifications VALIDATE CONSTRAINT notifications_user_fk')
  }

  override async down() {
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_projection_deliveries_claim_idx'
    )
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_tombstones_purge_idx')
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_outbox_recipient_idx')
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_outbox_lease_idx')
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_outbox_claim_idx')
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_outbox_projection_unique'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_acceptance_dedupe_unique'
    )
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_dedupe_unique')
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_event_recipient_unique')

    await this.db.rawQuery('DROP TABLE IF EXISTS notification_projection_deliveries')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_projection_targets')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_outbox')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_tombstones')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_acceptance_ledger')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_recipient_states')

    await this.db.rawQuery(`
      ALTER TABLE notifications
        DROP CONSTRAINT IF EXISTS notifications_user_fk,
        DROP CONSTRAINT IF EXISTS notifications_event_fingerprint_check,
        DROP CONSTRAINT IF EXISTS notifications_read_state_check,
        DROP CONSTRAINT IF EXISTS notifications_template_version_check,
        DROP CONSTRAINT IF EXISTS notifications_schema_version_check,
        DROP CONSTRAINT IF EXISTS notifications_revision_check,
        DROP COLUMN IF EXISTS dedupe_key,
        DROP COLUMN IF EXISTS revision,
        DROP COLUMN IF EXISTS action,
        DROP COLUMN IF EXISTS parameters,
        DROP COLUMN IF EXISTS locale,
        DROP COLUMN IF EXISTS template_version,
        DROP COLUMN IF EXISTS template_key,
        DROP COLUMN IF EXISTS priority,
        DROP COLUMN IF EXISTS category,
        DROP COLUMN IF EXISTS organization_id,
        DROP COLUMN IF EXISTS scope_id,
        DROP COLUMN IF EXISTS scope_type,
        DROP COLUMN IF EXISTS schema_version,
        DROP COLUMN IF EXISTS subject_id,
        DROP COLUMN IF EXISTS subject_type,
        DROP COLUMN IF EXISTS actor_id,
        DROP COLUMN IF EXISTS actor_type,
        DROP COLUMN IF EXISTS correlation_id,
        DROP COLUMN IF EXISTS occurred_at,
        DROP COLUMN IF EXISTS event_fingerprint,
        DROP COLUMN IF EXISTS event_id
    `)
  }
}
