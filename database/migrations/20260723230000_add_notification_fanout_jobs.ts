import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_fanout_jobs (
        id uuid PRIMARY KEY,
        sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
        source_event_name varchar(128) NOT NULL,
        business_event_id varchar(512) NOT NULL,
        template_fingerprint char(64) NOT NULL,
        target_fingerprint char(64) NOT NULL,
        notification_type varchar(128) NOT NULL,
        schema_version integer NOT NULL,
        scope_type varchar(32) NOT NULL,
        scope_id text,
        actor_type varchar(64),
        actor_id text,
        subject_type varchar(64),
        subject_id text,
        parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL,
        correlation_id varchar(255),
        dedupe_key varchar(255),
        status varchar(32) NOT NULL DEFAULT 'pending',
        target_count integer NOT NULL,
        processed_count integer NOT NULL DEFAULT 0,
        dead_letter_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        CONSTRAINT notification_fanout_jobs_source_unique
          UNIQUE (source_event_name, business_event_id),
        CONSTRAINT notification_fanout_jobs_status_check
          CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors')),
        CONSTRAINT notification_fanout_jobs_scope_check
          CHECK (
            (scope_type = 'system' AND scope_id IS NULL)
            OR (scope_type IN ('user', 'organization') AND scope_id IS NOT NULL)
          ),
        CONSTRAINT notification_fanout_jobs_actor_check
          CHECK ((actor_type IS NULL) = (actor_id IS NULL)),
        CONSTRAINT notification_fanout_jobs_subject_check
          CHECK ((subject_type IS NULL) = (subject_id IS NULL)),
        CONSTRAINT notification_fanout_jobs_schema_check CHECK (schema_version = 1),
        CONSTRAINT notification_fanout_jobs_count_check
          CHECK (
            target_count >= 1
            AND processed_count >= 0
            AND dead_letter_count >= 0
            AND processed_count + dead_letter_count <= target_count
          ),
        CONSTRAINT notification_fanout_jobs_template_fingerprint_check
          CHECK (template_fingerprint ~ '^[0-9a-f]{64}$'),
        CONSTRAINT notification_fanout_jobs_target_fingerprint_check
          CHECK (target_fingerprint ~ '^[0-9a-f]{64}$'),
        CONSTRAINT notification_fanout_jobs_parameters_size_check
          CHECK (octet_length(parameters::text) <= 16384)
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS notification_fanout_targets (
        id uuid PRIMARY KEY,
        sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
        job_id uuid NOT NULL,
        recipient_id uuid NOT NULL,
        event_id uuid NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'pending',
        available_at timestamptz NOT NULL DEFAULT now(),
        attempt_count integer NOT NULL DEFAULT 0,
        locked_by varchar(200),
        locked_until timestamptz,
        lease_token uuid,
        notification_id uuid,
        processed_at timestamptz,
        dead_lettered_at timestamptz,
        last_error_class varchar(200),
        last_error_message varchar(1024),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_fanout_targets_job_recipient_unique
          UNIQUE (job_id, recipient_id),
        CONSTRAINT notification_fanout_targets_event_recipient_unique
          UNIQUE (event_id, recipient_id),
        CONSTRAINT notification_fanout_targets_job_fk
          FOREIGN KEY (job_id) REFERENCES notification_fanout_jobs(id) ON DELETE CASCADE,
        CONSTRAINT notification_fanout_targets_recipient_fk
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT notification_fanout_targets_status_check
          CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter')),
        CONSTRAINT notification_fanout_targets_attempt_check CHECK (attempt_count >= 0),
        CONSTRAINT notification_fanout_targets_lease_check
          CHECK (
            (
              status = 'leased'
              AND locked_by IS NOT NULL
              AND locked_until IS NOT NULL
              AND lease_token IS NOT NULL
            )
            OR (
              status <> 'leased'
              AND locked_by IS NULL
              AND locked_until IS NULL
              AND lease_token IS NULL
            )
          ),
        CONSTRAINT notification_fanout_targets_terminal_time_check
          CHECK (
            (status = 'processed' AND processed_at IS NOT NULL AND dead_lettered_at IS NULL)
            OR (
              status = 'dead_letter'
              AND dead_lettered_at IS NOT NULL
              AND processed_at IS NULL
            )
            OR (
              status IN ('pending', 'leased')
              AND processed_at IS NULL
              AND dead_lettered_at IS NULL
            )
          )
      )
    `)

    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_fanout_targets_pending_claim_idx
        ON notification_fanout_targets (available_at, sequence)
        WHERE status = 'pending'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_fanout_targets_expired_lease_idx
        ON notification_fanout_targets (locked_until, sequence)
        WHERE status = 'leased'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_fanout_targets_job_status_idx
        ON notification_fanout_targets (job_id, status)
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS notification_fanout_jobs_status_idx
        ON notification_fanout_jobs (status, sequence)
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP INDEX CONCURRENTLY IF EXISTS notification_fanout_jobs_status_idx')
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_fanout_targets_job_status_idx'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_fanout_targets_expired_lease_idx'
    )
    await this.db.rawQuery(
      'DROP INDEX CONCURRENTLY IF EXISTS notification_fanout_targets_pending_claim_idx'
    )
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_fanout_targets')
    await this.db.rawQuery('DROP TABLE IF EXISTS notification_fanout_jobs')
  }
}
