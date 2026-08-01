/**
 * Shared DDL for the cache-invalidation transactional outbox.
 *
 * The migration and integration tests execute the same statements so test
 * evidence cannot silently drift away from the production schema.
 */
export const CACHE_INVALIDATION_OUTBOX_TRACKED_TABLES = [
  'organizations',
  'organization_users',
  'projects',
  'project_members',
  'tasks',
  'task_assignments',
  'task_applications',
  'task_statuses',
  'task_workflow_transitions',
  'task_required_skills',
  'review_sessions',
  'review_session_reviewer_assignments',
  'skill_reviews',
  'user_skills',
  'user_work_history',
  'users',
] as const

export const CACHE_INVALIDATION_OUTBOX_UP_SQL = [
  `
    CREATE TABLE IF NOT EXISTS cache_invalidation_outbox (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
      transaction_id bigint NOT NULL,
      source_table text NOT NULL,
      source_operation text NOT NULL,
      source_primary_key text NOT NULL,
      patterns jsonb NOT NULL,
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
      CONSTRAINT cache_invalidation_outbox_source_operation_check
        CHECK (source_operation IN ('INSERT', 'UPDATE', 'DELETE')),
      CONSTRAINT cache_invalidation_outbox_status_check
        CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter')),
      CONSTRAINT cache_invalidation_outbox_attempt_count_check
        CHECK (attempt_count >= 0),
      CONSTRAINT cache_invalidation_outbox_patterns_array_check
        CHECK (
          jsonb_typeof(patterns) = 'array'
          AND jsonb_array_length(patterns) BETWEEN 1 AND 64
        ),
      CONSTRAINT cache_invalidation_outbox_patterns_size_check
        CHECK (octet_length(patterns::text) <= 32768),
      CONSTRAINT cache_invalidation_outbox_source_table_size_check
        CHECK (octet_length(source_table) BETWEEN 1 AND 63),
      CONSTRAINT cache_invalidation_outbox_source_key_size_check
        CHECK (octet_length(source_primary_key) BETWEEN 1 AND 512)
    )
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS cache_invalidation_outbox_transaction_dedupe_idx
      ON cache_invalidation_outbox (
        transaction_id,
        source_table,
        source_primary_key,
        md5(patterns::text)
      )
  `,
  `
    CREATE INDEX IF NOT EXISTS cache_invalidation_outbox_claim_idx
      ON cache_invalidation_outbox (available_at, sequence)
      WHERE status = 'pending'
  `,
  `
    CREATE INDEX IF NOT EXISTS cache_invalidation_outbox_lease_idx
      ON cache_invalidation_outbox (locked_until, sequence)
      WHERE status = 'leased'
  `,
  `
    CREATE INDEX IF NOT EXISTS cache_invalidation_outbox_dead_letter_idx
      ON cache_invalidation_outbox (dead_lettered_at, sequence)
      WHERE status = 'dead_letter'
  `,
  `
    CREATE OR REPLACE FUNCTION public.enqueue_cache_invalidation_outbox()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $function$
    DECLARE
      row_data jsonb := '{}'::jsonb;
      old_data jsonb := '{}'::jsonb;
      new_data jsonb := '{}'::jsonb;
      patterns jsonb := '[]'::jsonb;
      source_id text;
      entity_id text;
      organization_id text;
      previous_organization_id text;
      project_id text;
      previous_project_id text;
      task_id text;
      previous_task_id text;
      task_list_pattern text := 'tasks:list:*';
      user_id text;
      secondary_user_id text;
      review_session_id text;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        row_data := new_data;
      ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        row_data := old_data;
      ELSE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        row_data := new_data;
      END IF;

      -- ORM timestamp-only touches do not change any cached representation.
      -- Avoid durable work and broad Redis scans for those no-op writes.
      IF TG_OP = 'UPDATE'
        AND (old_data - 'updated_at') = (new_data - 'updated_at')
      THEN
        RETURN NEW;
      END IF;

      entity_id := COALESCE(new_data ->> 'id', old_data ->> 'id');
      organization_id := COALESCE(
        new_data ->> 'organization_id',
        old_data ->> 'organization_id'
      );
      previous_organization_id := old_data ->> 'organization_id';
      project_id := COALESCE(new_data ->> 'project_id', old_data ->> 'project_id');
      previous_project_id := old_data ->> 'project_id';
      task_id := COALESCE(new_data ->> 'task_id', old_data ->> 'task_id');
      previous_task_id := old_data ->> 'task_id';
      user_id := COALESCE(
        new_data ->> 'user_id',
        old_data ->> 'user_id',
        new_data ->> 'reviewee_id',
        old_data ->> 'reviewee_id'
      );

      IF TG_TABLE_NAME = 'project_members' AND project_id IS NOT NULL THEN
        -- Parent DELETE triggers carry the authoritative tenant invalidation.
        -- A cascading child DELETE must not fall back to a global cold-cache
        -- event if the parent row is already invisible.
        task_list_pattern := NULL;
        SELECT projects.organization_id::text
        INTO organization_id
        FROM public.projects
        WHERE projects.id::text = project_id
        LIMIT 1;

        IF previous_project_id IS NOT NULL THEN
          SELECT projects.organization_id::text
          INTO previous_organization_id
          FROM public.projects
          WHERE projects.id::text = previous_project_id
          LIMIT 1;
        END IF;
      ELSIF TG_TABLE_NAME IN (
        'task_assignments',
        'task_applications',
        'task_required_skills'
      ) AND task_id IS NOT NULL THEN
        task_list_pattern := NULL;
        SELECT tasks.organization_id::text
        INTO organization_id
        FROM public.tasks
        WHERE tasks.id::text = task_id
        LIMIT 1;

        IF previous_task_id IS NOT NULL THEN
          SELECT tasks.organization_id::text
          INTO previous_organization_id
          FROM public.tasks
          WHERE tasks.id::text = previous_task_id
          LIMIT 1;
        END IF;
      END IF;

      IF organization_id IS NOT NULL THEN
        task_list_pattern := format('tasks:list:v2:org:%s:*', organization_id);
      END IF;

      CASE TG_TABLE_NAME
        WHEN 'organizations' THEN
          organization_id := entity_id;
          patterns := jsonb_build_array(
            format('org:detail:%s:*', organization_id),
            format('org:members:org:%s:*', organization_id),
            format('organization:pending_requests:org:%s', organization_id),
            'orgs:list:*',
            'users:work_history:*'
          );

        WHEN 'organization_users' THEN
          user_id := COALESCE(new_data ->> 'user_id', old_data ->> 'user_id');
          patterns := jsonb_build_array(
            format('org:detail:%s:*', organization_id),
            format('org:members:org:%s:*', organization_id),
            format('organization:pending_requests:org:%s', organization_id),
            'orgs:list:*',
            format('orgs:list:user:%s:*', user_id),
            task_list_pattern,
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            format('task:metadata:*:org:%s*', organization_id),
            format('users:work_history:%s:*', user_id)
          );

        WHEN 'projects' THEN
          project_id := entity_id;
          patterns := jsonb_build_array(
            'orgs:list:*',
            format('task:metadata:*:org:%s*', organization_id),
            task_list_pattern,
            'tasks:public:*',
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            'users:work_history:*',
            format('org:detail:%s:*', organization_id)
          );

        WHEN 'project_members' THEN
          user_id := COALESCE(new_data ->> 'user_id', old_data ->> 'user_id');
          patterns := jsonb_build_array(
            task_list_pattern,
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            format('users:work_history:%s:*', user_id),
            format('user:pending_reviews:*:userId:%s', user_id)
          );

        WHEN 'tasks' THEN
          task_id := entity_id;
          patterns := jsonb_build_array(
            format('task:audit:%s:*', task_id),
            task_list_pattern,
            'tasks:public:*',
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            format('task:metadata:*:org:%s*', organization_id),
            format('org:detail:%s:*', organization_id)
          );

        WHEN 'task_assignments' THEN
          secondary_user_id := COALESCE(
            new_data ->> 'assignee_id',
            old_data ->> 'assignee_id'
          );
          patterns := jsonb_build_array(
            format('task:audit:%s:*', task_id),
            task_list_pattern,
            'tasks:public:*',
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            format('task:applications:*:taskId:%s:*', task_id),
            'user:pending_reviews:*',
            format('users:work_history:%s:*', secondary_user_id),
            format('users:delivery_metrics:%s', secondary_user_id),
            format('users:spider_chart:v4:%s', secondary_user_id)
          );

        WHEN 'task_applications' THEN
          secondary_user_id := COALESCE(
            new_data ->> 'applicant_id',
            old_data ->> 'applicant_id'
          );
          patterns := jsonb_build_array(
            format('task:applications:*:taskId:%s:*', task_id),
            format('user:applications:*:userId:%s*', secondary_user_id),
            format('task:user:*:org:%s:*', organization_id),
            'tasks:public:*',
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            task_list_pattern
          );

        WHEN 'task_statuses', 'task_workflow_transitions' THEN
          patterns := jsonb_build_array(
            format('task:metadata:*:org:%s*', organization_id),
            task_list_pattern,
            'tasks:public:*',
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id)
          );

        WHEN 'task_required_skills' THEN
          patterns := jsonb_build_array(
            task_list_pattern,
            'tasks:public:*',
            format('task:user:*:org:%s:*', organization_id),
            format('tasks:grouped:org:%s:*', organization_id),
            format('tasks:timeline:org:%s:*', organization_id),
            format('task:stats:org:%s:*', organization_id),
            format('task:metadata:*:org:%s*', organization_id),
            format('task:applications:*:taskId:%s:*', task_id)
          );

        WHEN 'review_sessions' THEN
          review_session_id := entity_id;
          user_id := COALESCE(
            new_data ->> 'reviewee_id',
            old_data ->> 'reviewee_id'
          );
          patterns := jsonb_build_array(
            format('review:session:v4:sessionId:%s', review_session_id),
            'user:pending_reviews:*',
            format('users:featured_reviews:v2:%s:*', user_id),
            format('users:delivery_metrics:%s', user_id),
            format('users:spider_chart:v4:%s', user_id)
          );

        WHEN 'review_session_reviewer_assignments' THEN
          review_session_id := COALESCE(
            new_data ->> 'review_session_id',
            old_data ->> 'review_session_id'
          );
          secondary_user_id := COALESCE(
            new_data ->> 'reviewer_id',
            old_data ->> 'reviewer_id'
          );
          SELECT reviewee_id::text
          INTO user_id
          FROM public.review_sessions
          WHERE id::text = review_session_id
          LIMIT 1;
          patterns := jsonb_build_array(
            format('review:session:v4:sessionId:%s', review_session_id),
            format('user:pending_reviews:*:userId:%s', secondary_user_id)
          );

        WHEN 'skill_reviews' THEN
          review_session_id := COALESCE(
            new_data ->> 'review_session_id',
            old_data ->> 'review_session_id'
          );
          secondary_user_id := COALESCE(
            new_data ->> 'reviewer_id',
            old_data ->> 'reviewer_id'
          );
          SELECT reviewee_id::text
          INTO user_id
          FROM public.review_sessions
          WHERE id::text = review_session_id
          LIMIT 1;
          patterns := jsonb_build_array(
            format('review:session:v4:sessionId:%s', review_session_id),
            format('user:pending_reviews:*:userId:%s', secondary_user_id),
            format('users:featured_reviews:v2:%s:*', user_id),
            format('users:delivery_metrics:%s', user_id),
            format('users:spider_chart:v4:%s', user_id)
          );

        WHEN 'skills' THEN
          patterns := jsonb_build_array(
            'task:metadata:*',
            'review:session:v4:*',
            'users:featured_reviews:v2:*',
            'users:spider_chart:v4:*'
          );

        WHEN 'user_skills' THEN
          patterns := jsonb_build_array(
            format('users:spider_chart:v4:%s', user_id)
          );

        WHEN 'user_work_history' THEN
          patterns := jsonb_build_array(
            format('users:work_history:%s:*', user_id),
            format('users:delivery_metrics:%s', user_id)
          );

        WHEN 'users' THEN
          user_id := entity_id;
          patterns := jsonb_build_array(
            format('users:featured_reviews:v2:%s:*', user_id),
            format('users:work_history:%s:*', user_id),
            format('users:delivery_metrics:%s', user_id),
            format('users:spider_chart:v4:%s', user_id),
            format('orgs:list:user:%s:*', user_id),
            format('task:user:user:%s:*', user_id),
            'org:detail:*',
            'org:members:*',
            'tasks:list:*',
            'tasks:public:*',
            'task:user:*',
            'tasks:grouped:*',
            'tasks:timeline:*',
            'task:stats:*',
            'task:metadata:*',
            'user:applications:*'
          );
      END CASE;

      IF previous_organization_id IS NOT NULL
        AND previous_organization_id IS DISTINCT FROM organization_id
      THEN
        patterns := patterns || jsonb_build_array(
          format('tasks:list:v2:org:%s:*', previous_organization_id),
          format('task:user:*:org:%s:*', previous_organization_id),
          format('tasks:grouped:org:%s:*', previous_organization_id),
          format('tasks:timeline:org:%s:*', previous_organization_id),
          format('task:stats:org:%s:*', previous_organization_id),
          format('task:metadata:*:org:%s*', previous_organization_id)
        );
      END IF;

      SELECT COALESCE(jsonb_agg(to_jsonb(pattern) ORDER BY pattern), '[]'::jsonb)
      INTO patterns
      FROM (
        SELECT DISTINCT value AS pattern
        FROM jsonb_array_elements_text(patterns)
        WHERE value IS NOT NULL
          AND value <> ''
          AND value NOT LIKE '%::*'
          AND value NOT IN (
            'task:user:*:org:*',
            'tasks:grouped:org:*',
            'tasks:timeline:org:*',
            'task:stats:org:*',
            'task:metadata:*:org:*',
            'task:applications:*:taskId::*',
            'user:applications:*:userId:*'
          )
          AND octet_length(value) <= 512
      ) AS normalized_patterns;

      IF jsonb_array_length(patterns) = 0 THEN
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END IF;

      source_id := COALESCE(
        row_data ->> 'id',
        NULLIF(
          concat_ws(
            ':',
            row_data ->> 'organization_id',
            row_data ->> 'project_id',
            row_data ->> 'user_id'
          ),
          ''
        ),
        md5(row_data::text)
      );

      INSERT INTO public.cache_invalidation_outbox (
        transaction_id,
        source_table,
        source_operation,
        source_primary_key,
        patterns
      )
      VALUES (
        txid_current(),
        TG_TABLE_NAME,
        TG_OP,
        source_id,
        patterns
      )
      ON CONFLICT DO NOTHING;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END;
    $function$
  `,
  `
    REVOKE ALL ON FUNCTION public.enqueue_cache_invalidation_outbox() FROM PUBLIC
  `,
  `
    DO $block$
    DECLARE
      tracked_table text;
    BEGIN
      -- Snapshot reads currently bypass Redis for authorization and secret
      -- safety, so remove any trigger left by an older cache schema.
      IF to_regclass('public.user_profile_snapshots') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS cache_invalidation_outbox_after_change
          ON public.user_profile_snapshots;
      END IF;

      FOREACH tracked_table IN ARRAY ARRAY[
        'organizations',
        'organization_users',
        'projects',
        'project_members',
        'tasks',
        'task_assignments',
        'task_applications',
        'task_statuses',
        'task_workflow_transitions',
        'task_required_skills',
        'review_sessions',
        'review_session_reviewer_assignments',
        'skill_reviews',
        'skills',
        'user_skills',
        'user_work_history',
        'users'
      ]
      LOOP
        IF to_regclass(format('public.%I', tracked_table)) IS NOT NULL THEN
          EXECUTE format(
            'DROP TRIGGER IF EXISTS cache_invalidation_outbox_after_change ON public.%I',
            tracked_table
          );
          EXECUTE format(
            'CREATE TRIGGER cache_invalidation_outbox_after_change
             AFTER INSERT OR UPDATE OR DELETE ON public.%I
             FOR EACH ROW EXECUTE FUNCTION public.enqueue_cache_invalidation_outbox()',
            tracked_table
          );
        END IF;
      END LOOP;
    END;
    $block$
  `,
] as const

export const CACHE_INVALIDATION_OUTBOX_DOWN_SQL = [
  `
    DO $block$
    DECLARE
      tracked_table text;
    BEGIN
      FOREACH tracked_table IN ARRAY ARRAY[
        'organizations',
        'organization_users',
        'projects',
        'project_members',
        'tasks',
        'task_assignments',
        'task_applications',
        'task_statuses',
        'task_workflow_transitions',
        'task_required_skills',
        'review_sessions',
        'review_session_reviewer_assignments',
        'skill_reviews',
        'skills',
        'user_skills',
        'user_work_history',
        'user_profile_snapshots',
        'users'
      ]
      LOOP
        IF to_regclass(format('public.%I', tracked_table)) IS NOT NULL THEN
          EXECUTE format(
            'DROP TRIGGER IF EXISTS cache_invalidation_outbox_after_change ON public.%I',
            tracked_table
          );
        END IF;
      END LOOP;
    END;
    $block$
  `,
  'DROP FUNCTION IF EXISTS public.enqueue_cache_invalidation_outbox()',
  'DROP TABLE IF EXISTS cache_invalidation_outbox',
] as const
