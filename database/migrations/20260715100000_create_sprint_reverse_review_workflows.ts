import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS sprint_reverse_review_workflows (
        id uuid DEFAULT public.gen_random_uuid_v7() NOT NULL,
        sprint_id varchar(255) NOT NULL,
        project_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        reviewer_id uuid NOT NULL,
        target_type varchar(32) NOT NULL,
        target_user_id uuid,
        target_entity_id uuid,
        responder_id uuid,
        status varchar(32) DEFAULT 'awaiting_review' NOT NULL,
        rating integer,
        comment text,
        package_id varchar(255),
        submitted_at timestamptz,
        accepted_at timestamptz,
        reported_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT sprint_reverse_review_workflows_pkey PRIMARY KEY (id)
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS sprint_reverse_review_messages (
        id uuid DEFAULT public.gen_random_uuid_v7() NOT NULL,
        workflow_id uuid NOT NULL,
        author_id uuid NOT NULL,
        message_type varchar(24) DEFAULT 'review' NOT NULL,
        body text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT sprint_reverse_review_messages_pkey PRIMARY KEY (id)
      )
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_sprint_reverse_review_workflows_reviewer_status
      ON sprint_reverse_review_workflows (reviewer_id, status, updated_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_sprint_reverse_review_workflows_responder_status
      ON sprint_reverse_review_workflows (responder_id, status, updated_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_sprint_reverse_review_workflows_sprint_status
      ON sprint_reverse_review_workflows (sprint_id, status, updated_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_sprint_reverse_review_messages_workflow_created
      ON sprint_reverse_review_messages (workflow_id, created_at ASC)
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP TABLE IF EXISTS sprint_reverse_review_messages')
    await this.db.rawQuery('DROP TABLE IF EXISTS sprint_reverse_review_workflows')
  }
}
