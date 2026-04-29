import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS filter_saved_view_taxonomy_refs (
        saved_view_id UUID NOT NULL,
        field_key VARCHAR(240) NOT NULL,
        namespace VARCHAR(120) NOT NULL,
        term_id VARCHAR(240) NOT NULL,
        validated_version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pk_filter_saved_view_taxonomy_refs
          PRIMARY KEY (saved_view_id, field_key, namespace, term_id),
        CONSTRAINT fk_filter_saved_view_taxonomy_refs_view
          FOREIGN KEY (saved_view_id) REFERENCES filter_saved_views (id) ON DELETE CASCADE,
        CONSTRAINT ck_filter_saved_view_taxonomy_refs_version
          CHECK (validated_version >= 0),
        CONSTRAINT ck_filter_saved_view_taxonomy_refs_namespace
          CHECK (namespace ~ '^[a-z0-9][a-z0-9._-]*$'),
        CONSTRAINT ck_filter_saved_view_taxonomy_refs_non_blank
          CHECK (char_length(btrim(field_key)) > 0 AND char_length(btrim(term_id)) > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_filter_saved_view_taxonomy_refs_lookup
        ON filter_saved_view_taxonomy_refs (namespace, term_id, saved_view_id);
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`DROP TABLE IF EXISTS filter_saved_view_taxonomy_refs`)
  }
}
