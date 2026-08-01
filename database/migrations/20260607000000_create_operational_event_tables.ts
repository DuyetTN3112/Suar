import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.schema.raw(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id UUID,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80) NOT NULL,
        entity_id VARCHAR(80),
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_audit_events PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_entity_time
        ON audit_events (entity_type, entity_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_action_time
        ON audit_events (action, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_user_time
        ON audit_events (user_id, occurred_at DESC);

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        type VARCHAR(120) NOT NULL,
        related_entity_type VARCHAR(80),
        related_entity_id VARCHAR(80),
        metadata JSONB,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_notifications PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_created
        ON notifications (user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
        ON notifications (user_id, is_read, created_at DESC);

      CREATE TABLE IF NOT EXISTS user_activity_events (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        action_type VARCHAR(120) NOT NULL,
        action_data JSONB,
        related_entity_type VARCHAR(80),
        related_entity_id VARCHAR(80),
        ip_address VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_user_activity_events PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_activity_events_user_created
        ON user_activity_events (user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_activity_events_user_action
        ON user_activity_events (user_id, action_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS error_events (
        id UUID NOT NULL DEFAULT gen_random_uuid(),
        code VARCHAR(120) NOT NULL,
        status INT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'error',
        message TEXT NOT NULL,
        safe_message TEXT,
        details JSONB,
        request_id UUID,
        correlation_id UUID,
        actor_user_id UUID,
        actor_org_id UUID,
        method VARCHAR(16),
        url TEXT,
        ip_address VARCHAR(64),
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_error_events PRIMARY KEY (id)
      );

      CREATE INDEX IF NOT EXISTS idx_error_events_code_created
        ON error_events (code, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_error_events_status_created
        ON error_events (status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_error_events_correlation
        ON error_events (correlation_id, created_at DESC);
    `)
  }

  override async down(): Promise<void> {
    await this.schema.raw(`
      DROP TABLE IF EXISTS error_events;
      DROP TABLE IF EXISTS user_activity_events;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS audit_events;
    `)
  }
}
