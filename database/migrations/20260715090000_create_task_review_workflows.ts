import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS task_review_workflows (
        id uuid DEFAULT public.gen_random_uuid_v7() NOT NULL,
        task_id uuid NOT NULL,
        project_id uuid NOT NULL,
        organization_id uuid NOT NULL,
        reviewee_id uuid,
        status varchar(32) DEFAULT 'awaiting_review' NOT NULL,
        required_review_count integer DEFAULT 2 NOT NULL,
        completed_review_count integer DEFAULT 0 NOT NULL,
        accepted_by_reviewee_at timestamptz,
        reported_at timestamptz,
        reported_by uuid,
        completed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT task_review_workflows_pkey PRIMARY KEY (id)
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS task_review_reviewers (
        id uuid DEFAULT public.gen_random_uuid_v7() NOT NULL,
        workflow_id uuid NOT NULL,
        reviewer_id uuid NOT NULL,
        reviewer_role varchar(32) NOT NULL,
        is_required boolean DEFAULT true NOT NULL,
        status varchar(16) DEFAULT 'pending' NOT NULL,
        priority_rank integer DEFAULT 100 NOT NULL,
        reviewed_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT task_review_reviewers_pkey PRIMARY KEY (id)
      )
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS task_review_messages (
        id uuid DEFAULT public.gen_random_uuid_v7() NOT NULL,
        workflow_id uuid NOT NULL,
        author_id uuid NOT NULL,
        message_type varchar(24) DEFAULT 'review' NOT NULL,
        body text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL,
        CONSTRAINT task_review_messages_pkey PRIMARY KEY (id)
      )
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_task_review_workflows_project_status
      ON task_review_workflows (project_id, status, updated_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_task_review_reviewers_reviewer_status
      ON task_review_reviewers (reviewer_id, status)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_task_review_messages_workflow_created
      ON task_review_messages (workflow_id, created_at ASC)
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP TABLE IF EXISTS task_review_messages')
    await this.db.rawQuery('DROP TABLE IF EXISTS task_review_reviewers')
    await this.db.rawQuery('DROP TABLE IF EXISTS task_review_workflows')
  }
}
