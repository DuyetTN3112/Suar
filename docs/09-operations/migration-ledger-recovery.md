# Migration Ledger Recovery Runbook

Reviewed: 2026-07-24

## Release decision

The ledger is now technically reproducible, but production release remains
blocked because the candidate baseline was generated from the local development
database and has not received database-owner and release-owner approval. The
default gate fails closed with `schema_dump_approval_required`.

Before recovery, the observed ledger was:

- 24 completed
- 41 corrupt (recorded in `adonis_schema`, source missing)
- 5 pending

Lucid returned exit code `0` for that state. Use
`pnpm run db:migrations:verify`, not the exit code from
`migration:status`, as the release decision.

Sixteen of the 41 missing source files were recovered byte-for-byte from local
Git objects. Their SHA-256 values match the original blobs. The five legitimate
pending migrations were reviewed, dry-run, backed up, and then applied as batch 29. The current local ledger has 70 distinct rows and the technical
reconciliation is:

- 45 completed source migrations
- 0 pending
- 0 corrupt
- 25 migrations represented by the schema baseline
- 1 governance issue: baseline approval is still required

`migration:ledger-verify --json` therefore returns exit code `2` until the
approval evidence is recorded. The counts remain visible so a missing approval
cannot disguise a schema or checksum problem.

The recovered files remain untracked until explicitly committed. Do not run
garbage collection or discard the worktree before they are preserved in source
control. The same applies to the schema dump, checksum manifest and sidecar.

## Candidate baseline verification evidence

The current candidate contains schema only, the two Lucid ledger tables, and
the minimum canonical reference data required by the missing proficiency
migrations:

- `proficiency_scales`: one `system_default` row
- `proficiency_levels`: 15 rows (`L0` through `L14`)

It intentionally excludes business/demo rows, including professional-role and
rubric seed data. The SQL SHA-256 is
`c87f5b80b9822a4285f46dcf1b266f10dce85ac4ac6e3511698c7defc4ff5e5c`.

The clean-bootstrap proof used a brand-new PostgreSQL 16.12 instance:

1. Lucid restored `database/schema/pg-schema.sql`.
2. All five post-baseline migrations ran successfully.
3. The resulting ledger contained 70 rows, 70 distinct names and max batch 29.
4. Notification schema integration tests passed 4/4.
5. Development and proof databases both contained 87 tables, 1,420 columns,
   418 indexes, 312 constraints, 69 public functions, 16 custom triggers and
   the same `pg_trgm`, `pgcrypto`, and `plpgsql` extensions.
6. A full schema-only dump comparison had equal line counts. All 158 changed
   lines were PostgreSQL `ANY` expression pretty-printing or randomized
   `pg_dump` restrict tokens; there were zero unclassified structural changes.

This proves repeatability of the local candidate. It does not prove that the
local database is the authoritative production schema.

## Recovered artifact evidence

| Migration                                                       | SHA-256                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `20260602000000_create_task_completion_package_tables.ts`       | `31095d4e24edf7d770865105af51ec63cbcbbd75a246c6140e7eb30df66258f5` |
| `20260602001000_create_review_dispute_tables.ts`                | `7f2f823efc96a5f664f27e9234db5d38490ea80f7e3d2415db9fe5f6e2a4c9a2` |
| `20260602002000_create_ai_dispute_tables.ts`                    | `efb4d552f3b0fa05868b93aff774d698f090956304b39ab2bec8f869c28efbd7` |
| `20260605000000_add_is_fraud_to_skill_reviews.ts`               | `f6b1156ee27f8cb8fd77faf7343e18c95e2cf699756f3d3f9b6137076d6d5167` |
| `20260607000000_create_operational_event_tables.ts`             | `2f450bddcb44253d65ef02a50f0a5a3679888d2d0241843f31c972566e117975` |
| `20260607125500_add_user_setting_to_users.ts`                   | `245ec3a3b22b44027b28991e60fe93e9a567cab7f06920926c9f488b00d27894` |
| `20260611000000_create_proficiency_scales_tables.ts`            | `0850e139af78773a4b1492a7bc9b803b3771b161e6d6df149785f9bf86039828` |
| `20260611000100_create_skill_rubrics_tables.ts`                 | `f77864f854a97f8554369efc366583e5e52ffbddf934019587769409fc719e05` |
| `20260611000200_create_project_skills_tables.ts`                | `420b8ef91558aaf6cfd93d0df2f26e49f35b03bac4fb32289c950001647f269a` |
| `20260611000300_create_professional_roles_tables.ts`            | `5484075f9b3e3018b686c2becb458841119e90202f26aa2d261c24642933244e` |
| `20260611000400_alter_task_required_skills_semantic.ts`         | `bb4bea212ca2e38a8c1c2ae2bcf8c543b3dd5e5a2029c753b63f3407d46333e3` |
| `20260611000500_create_task_requirement_versions.ts`            | `e90d09db880b008640f457045baeb2c170796f5baf1d1fd6c9d98e881808248a` |
| `20260611000600_alter_skill_reviews_evidence.ts`                | `f4af9cb7354236af76611f528e732d76d2a33c16a5337058b1d15d4cd29d26de` |
| `20260611131056_add_proficiency_level_id_to_existing_tables.ts` | `cea0a34ab2818c115f1876434a4dbfd14215b2143e86d46439d9dd1343d31d29` |
| `20260623000000_create_subscription_packages.ts`                | `4d583a4ea1f68bbe71ec86aaed2873c3f610519a316e3c5d9fda4c3b2fc79a7c` |
| `20260624000000_add_competency_evidence_fields.ts`              | `b800bff0c1f266f8f104e3a017a2d903df8ad986c08f5a6ec76f2b62108d7ad3` |

## Source artifacts still missing

The following 25 ledger entries were not found in reachable refs, reflog,
unreachable local Git objects, any `origin` branch/tag history, build output, or
the inspected SQL backups. The local Docker daemon also had no `suar` image to
inspect. These names are covered only by the unapproved candidate baseline:

- `20260630090000_repair_competency_evidence_fields_partial_upgrade`
- `20260701100000_backfill_system_default_proficiency_scale`
- `20260701183000_canonicalize_proficiency_level_code_columns`
- `20260701194500_backfill_skill_rubric_level_descriptor_fields`
- `20260703103000_add_project_professional_role_to_project_members`
- `20260704113919_drop_legacy_db_logic_and_fks`
- `20260704114532_drop_user_skills_user_fk_alias`
- `20260704114639_drop_updated_at_triggers`
- `20260704153000_rename_proficiency_code_columns_to_public_names`
- `20260705194000_add_pagination_indexes_for_reviews`
- `20260705203000_add_audit_log_pagination_indexes`
- `20260705214500_add_notification_pagination_indexes`
- `20260705231000_add_flagged_review_pagination_indexes`
- `20260706001000_add_user_activity_pagination_indexes`
- `20260706002000_add_review_session_pending_pagination_indexes`
- `20260706110000_extend_task_comments_and_review_governance`
- `20260706123000_add_reverse_review_target_stats`
- `20260706143000_add_review_session_reviewer_assignments`
- `1783865030888_create_marketplace_applications_table`
- `1783918000000_create_project_sprint_reviews_tables`
- `1783919000000_remove_budget_columns_from_projects_tasks_and_applications`
- `1783919500000_rename_freelancer_fields_to_external_contributors`
- `1783920000000_create_sprint_review_disputes_tables`
- `1783921000000_add_project_sprint_membership_to_tasks`
- `1784112841487_create_custom_system_roles_table`

Search deployment images, CI artifacts, release bundles, developer clones and
backup media for these exact names. Verify provenance and content hashes before
restoring them. A file with a matching name but unverified content is not a
recovery.

## Preferred recovery path

1. Freeze production schema changes and retain a database backup plus a copy of
   `adonis_schema` and `adonis_schema_versions`.
2. Preserve the 16 recovered files in source control without formatting or
   content changes.
3. Recover the remaining 25 exact source files from trusted release artifacts.
4. Verify `database/migration-checksums.json` against every retained or
   recovered artifact. Never refresh a checksum to accept a changed applied
   migration.
5. Test an empty PostgreSQL 16 bootstrap and an upgrade from the previous
   production snapshot.
6. Compare schema fingerprints, required extensions, functions, triggers,
   constraints, indexes and reference-data invariants.
7. Record approved change-control evidence in
   `database/schema/pg-schema.meta.json`.
8. Run `pnpm run db:migrations:verify -- --json`; only exit code `0` permits
   release.

## Canonical baseline fallback

Use this only when the remaining exact artifacts cannot be recovered:

1. Restore a production backup into an isolated clone and prove its version,
   ledger and schema fingerprint.
2. Generate the Lucid schema dump from that verified clone using the configured
   `pg` connection. Never use `--prune` during recovery.
3. Review the SQL and sidecar manifest. Include the SQL SHA-256 in
   `database/migration-checksums.json`.
4. Bootstrap a completely empty PostgreSQL 16 instance from the dump, then run
   only forward migrations and validate data/schema invariants.
5. Obtain database-owner and release-owner change approval before making the
   baseline canonical.

An approved sidecar must use `baselineApproval.status = "approved"` and contain
non-empty `changeId`, `databaseOwner`, `releaseOwner`, and a parseable
`approvedAt` timestamp. Do not fabricate these fields to make the gate pass.

Do not edit ledger rows, create empty placeholder migrations, mark missing
files as squashed without a verified SQL dump, or rollback across the baseline.
Use forward fixes or point-in-time recovery after the baseline.
