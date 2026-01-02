# Four-Category Skill Taxonomy Design

Date: 2026-07-18
Status: Draft for review
Scope: Research/spec only. No runtime behavior changed in this document.

## Decision

Suar will move top-level skill taxonomy from three categories to four categories:

| Code          | Label       | Meaning                                                                                                         | Examples                                                                                                  |
| ------------- | ----------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `technology`  | Technology  | Concrete language, framework, runtime, database, tool, platform, or tech stack item.                            | React, PostgreSQL, Redis, Java, C#, NestJS, TypeScript, Svelte, Node.js                                   |
| `engineering` | Engineering | Software engineering fundamentals, design knowledge, architecture, quality practices, and implementation craft. | OOP, Design Patterns, Clean Code, API Design, System Design, Testing Strategy, Code Review, Design System |
| `soft_skill`  | Soft Skill  | Human collaboration and cognitive behavior.                                                                     | Communication, Leadership, Problem Solving                                                                |
| `delivery`    | Delivery    | Execution ownership, planning, release discipline, risk, documentation, and delivery reliability.               | Planning, Estimation, Release, Risk Tracking, Documentation                                               |

The old `technical` category is removed from canonical taxonomy. It is not kept as an alias in new persisted data.

## Current State Evidence

Runtime currently assumes exactly three categories: `technical`, `soft_skill`, `delivery`.

- Database `skills.category_code` has CHECK constraint allowing only those three values.
- Main DB `suar` currently has 11 seeded skills:
  - `technical/spider_chart`: 6
  - `soft_skill/spider_chart`: 3
  - `delivery/spider_chart`: 2
- Test DB `suar_test` has the same CHECK constraint, but no seeded skills during this audit.
- L0-L14 proficiency scale is independent and remains unchanged.

GitNexus impact checks:

- `TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS`: risk MEDIUM, 2 direct callers.
- `PROFILE_SKILL_GROUP_ORDER`: risk MEDIUM, 3 direct callers.
- `GetSpiderChartDataQuery`: risk MEDIUM, 10 direct callers.

Because this is a top-level taxonomy migration, real product blast radius is broader than symbol graph output.

## Migration Mapping

Current seeded skills should migrate as follows:

| Current skill   | Current category | New category  | Note                                                                              |
| --------------- | ---------------- | ------------- | --------------------------------------------------------------------------------- |
| React           | `technical`      | `technology`  | Framework/library                                                                 |
| Node.js         | `technical`      | `technology`  | Runtime/platform                                                                  |
| TypeScript      | `technical`      | `technology`  | Language                                                                          |
| Svelte          | `technical`      | `technology`  | Framework                                                                         |
| PostgreSQL      | `technical`      | `technology`  | Database                                                                          |
| DevOps          | `technical`      | `technology`  | Ambiguous; keep as technology for first migration, split later if needed          |
| Testing & QA    | `delivery`       | `engineering` | Quality engineering practice, not delivery ownership                              |
| Code Review     | `delivery`       | `engineering` | Engineering quality practice                                                      |
| Communication   | `soft_skill`     | `soft_skill`  | Keep                                                                              |
| Problem Solving | `soft_skill`     | `soft_skill`  | Keep, even though technical debugging may later become separate engineering skill |
| Leadership      | `soft_skill`     | `soft_skill`  | Keep                                                                              |

New seed skills to add:

| Skill code                 | Skill name                  | Category      |
| -------------------------- | --------------------------- | ------------- |
| `oop`                      | Object-Oriented Programming | `engineering` |
| `design_patterns`          | Design Patterns             | `engineering` |
| `clean_code`               | Clean Code                  | `engineering` |
| `api_design`               | API Design                  | `engineering` |
| `system_design`            | System Design               | `engineering` |
| `data_modelling`           | Data Modelling              | `engineering` |
| `security_fundamentals`    | Security Fundamentals       | `engineering` |
| `performance_optimization` | Performance Optimization    | `engineering` |
| `observability_debugging`  | Observability & Debugging   | `engineering` |
| `design_system`            | Design System               | `engineering` |
| `accessibility`            | Accessibility               | `engineering` |
| `planning`                 | Planning                    | `delivery`    |
| `estimation`               | Estimation                  | `delivery`    |
| `release_management`       | Release Management          | `delivery`    |
| `risk_tracking`            | Risk Tracking               | `delivery`    |
| `documentation`            | Documentation               | `delivery`    |

Optional later technology seed expansion:

- Redis
- Java
- C#
- NestJS
- C
- Docker
- Kubernetes

## Required Product Rule Change

Old task required-skill rule:

```text
technical >= 2
soft_skill >= 2
delivery >= 2
```

Recommended new rule:

```text
technology >= 1
engineering >= 1
soft_skill >= 1
delivery >= 1
```

Reason:

- Preserves balanced task design.
- Avoids forcing 8 required skills per task.
- Lets role templates and project role skill weights express deeper needs.

If product wants the old strength, use:

```text
technology >= 2
engineering >= 2
soft_skill >= 2
delivery >= 2
```

Risk: too many required skills for normal task creation.

## Contract Design

Create one canonical taxonomy source in skills module:

```ts
export enum SkillCategoryCode {
  TECHNOLOGY = 'technology',
  ENGINEERING = 'engineering',
  SOFT_SKILL = 'soft_skill',
  DELIVERY = 'delivery',
}

export const SKILL_CATEGORY_ORDER = [
  SkillCategoryCode.TECHNOLOGY,
  SkillCategoryCode.ENGINEERING,
  SkillCategoryCode.SOFT_SKILL,
  SkillCategoryCode.DELIVERY,
] as const
```

Move existing `SkillCategoryCode` and `skillCategoryOptions` out of `app/modules/users/constants/user_constants.ts` into a skills-owned public contract or constants file. Users/tasks/profile/search should import from skills, not define category values locally.

Recommended labels:

| Code          | English     | Vietnamese        |
| ------------- | ----------- | ----------------- |
| `technology`  | Technology  | Công nghệ         |
| `engineering` | Engineering | Kỹ thuật phần mềm |
| `soft_skill`  | Soft Skill  | Kỹ năng mềm       |
| `delivery`    | Delivery    | Thực thi          |

## DB And Schema Changes

Required migration:

1. Drop old `skills_category_code_check`.
2. Update existing rows:
   - `technical` -> `technology`
   - `delivery` rows with `skill_code in ('testing', 'code_review')` -> `engineering`
   - Keep `soft_skill`
3. Add new `delivery` skills.
4. Add new `engineering` skills.
5. Re-add `skills_category_code_check` with allowed values:
   - `technology`
   - `engineering`
   - `soft_skill`
   - `delivery`
6. Keep `idx_skills_category`.
7. Regenerate DB schema artifacts.
8. Update `docs_AI/suar.sql`.

Files:

- `database/migrations/<new>_migrate_skill_categories_to_four_groups.ts`: create.
- `database/schema.ts`: regenerate/update `SkillSchema` if generated output changes.
- `docs_AI/suar.sql`: update `skills_category_code_check`.
- `docs_AI/integration_test_db_connect.md`: no behavior change, but useful verification command can mention new allowed category list later.

DB evidence locations:

- `docs_AI/suar.sql:964`: `skills` table.
- `docs_AI/suar.sql:976`: old CHECK constraint.
- `docs_AI/suar.sql:3743`: `idx_skills_category`.
- `database/schema.ts:1066`: generated `SkillSchema`.

## Backend Runtime Changes

### Skills Module

Files to change:

- `app/modules/skills/constants/skill_constants.ts`
  - Add canonical `SkillCategoryCode`, labels, order, display config.
  - Keep display type constants.
- `app/modules/skills/infra/models/skill.ts`
  - Update comments from old v3 taxonomy.
  - Optional: narrow `category_code` type if repo pattern allows.
- `app/modules/skills/actions/ports/skill_external_dependencies.ts`
  - Keep string return or use new type.
- `app/modules/skills/actions/ports/skill_external_dependencies_impl.ts`
  - No logic change, but type import may change.
- `app/modules/skills/actions/queries/get_active_skills_query.ts`
  - Ensure new categories pass through.
- `app/modules/skills/actions/queries/list_active_skills_catalog_query.ts`
  - Ensure catalog returns new category labels if API chooses to expose labels.
- `app/modules/skills/infra/repositories/read/skill_queries.ts`
  - `byCategory` works, but tests should cover new categories.
- `app/modules/skills/infra/repositories/skill_repository.ts`
  - Type references only.
- `app/modules/skills/application/ports/skill_search_document_reader.ts`
  - Type category if introducing canonical type.
- `app/modules/skills/infra/adapters/lucid_skill_search_document_reader.ts`
  - No logic change, but type update.
- `app/modules/skills/public_contracts/active_skill_catalog.ts`
  - Re-export new contract if needed.
- `app/modules/skills/public_contracts/skill_public_api.ts`
  - No behavior change expected, but category contract should be reachable here.

### Users/Profile Module

Files to change:

- `app/modules/users/constants/user_constants.ts`
  - Remove/move `SkillCategoryCode` and `skillCategoryOptions`.
  - Replace old DB comment.
- `app/modules/users/actions/queries/get_spider_chart_data_query.ts`
  - Replace fixed result `{ technical, soft_skills, delivery }`.
  - Preferred contract: category array or `Record<SkillCategoryCode, SpiderChartPoint[]>`.
  - Include `technology` and `engineering`.
- `app/modules/users/actions/queries/get_user_skills_query.ts`
  - Category filter already generic; use canonical validation only if needed.
- `app/modules/users/actions/queries/get_profile_show_page_query.ts`
  - Update response type for spider chart/category groups.
- `app/modules/users/actions/queries/get_profile_view_page_query.ts`
  - Same as show query.
- `app/modules/users/controllers/mappers/request/user_request_mapper.ts`
  - DTO no hardcoded category, but generated declaration changes.
- `app/modules/users/infra/repositories/read/analytics_queries.ts`
  - Aggregation already returns category string; verify summaries handle four groups.
- `app/modules/users/infra/repositories/read/types.ts`
  - Type category if narrowed.
- `app/modules/users/actions/ports/user_external_dependencies.ts`
  - Type `category_code`.
- `app/modules/users/actions/ports/user_external_dependencies_impl.ts`
  - Pass through category.
- `app/modules/users/actions/queries/search_talents_query.ts`
  - Backend filter accepts category array; add validation or leave permissive.
- `app/modules/users/bootstrap/user_query_factory.ts`
  - Backend filter accepts category array; update test cases for four categories.
- `app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts`
  - Check snapshot summary output if category summaries are persisted.
- `app/modules/users/actions/support/user_query_cache_keys.ts`
  - If spider/profile cache key shape changes, bump cache version.
- `app/modules/users/domain/profile_metrics_types.ts`
  - If category summaries typed, add four-category type.
- `app/modules/users/types/user_records.ts`
  - Type category if narrowed.

### Tasks Module

Files to change:

- `app/modules/tasks/actions/support/task_required_skill_category_rules.ts`
  - Replace 3-category constants with 4-category constants.
  - Recommended minimum: 1 each.
  - Update labels and error copy.
  - Count `technology`, `engineering`, `soft_skill`, `delivery`.
- `app/modules/tasks/actions/support/task_required_skill_persistence.ts`
  - Uses category rule; update tests.
- `app/modules/tasks/actions/services/task_skill_requirement_service.ts`
  - Uses category rule on removal.
  - Also consider validating category mix after `addRequirement`; current add path does not re-check final mix.
- `app/modules/tasks/actions/queries/get_task_metadata_query.ts`
  - `availableSkills` passes categoryCode; no logic change but cache version should bump.
- `app/modules/tasks/actions/ports/task_external_dependencies.ts`
  - Type category if narrowed.
- `app/modules/tasks/bootstrap/adapters/monolith_task_skill_reader.ts`
  - No logic change, but type.
- `app/modules/tasks/controllers/v1/get_role_requirements_controller.ts`
  - Pass-through category; update tests/contracts.

### Reviews Module

Files to change:

- `app/modules/reviews/actions/commands/calculate_spider_chart_command.ts`
  - Comment currently says spider skills include soft/delivery; update.
  - Behavior may remain display-type based.
- `app/modules/reviews/README.md`
  - Update old spider/category docs.
- Review read/query serializers that expose skill category should be test-covered but likely do not hardcode old values.

### Search Module

Files to change:

- `app/modules/search/domain/skill_search_document.ts`
  - Type category if narrowed.
- `app/modules/search/infra/skills/skill_search_document_builder.ts`
  - Pass-through category; include new labels only if search result needs them.
- `app/modules/search/infra/skills/skill_search_index_repository.ts`
  - Existing mapping has `category_code` keyword.
  - Reindex after migration.
  - Consider searching category labels so query "engineering" finds engineering skills.
- `app/modules/search/actions/queries/global_search/entity_result_mapper.ts`
  - Skill breadcrumbs display category code; map to label.

### Marketplace/Talent Discovery

Files to change:

- `app/modules/users/actions/queries/search_talents_query.ts`
  - `skill_categories` filter remains.
  - Add tests for `technology` and `engineering`.
- `app/modules/users/bootstrap/user_query_factory.ts`
  - Same filter for talent page.
- `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts`
  - Category filter expectations need update.

### Testing Routes

Files to change:

- `start/routes/testing.ts`
  - `seed-project-operating-model` role skills currently create 2 technical, 2 soft, 2 delivery.
  - `seed-scope` skills currently create 2 technical, 2 soft, 2 delivery.
  - Marketplace seed currently creates technical/soft/delivery only.
  - Review/dispute seed creates technical-only skills.
  - Replace with technology/engineering/soft_skill/delivery seeds.

## Frontend Changes

There are duplicated `user` and `org` Inertia apps. Update both surfaces unless refactoring shared code first.

### Task Create/Requirement UI

Files to change:

- `inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.ts`
- `inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.ts`
- `inertia/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte`
- `inertia/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte`
- `inertia/apps/user/modules/tasks/components/modals/create_task_store.svelte.ts`
- `inertia/apps/org/modules/tasks/components/modals/create_task_store.svelte.ts`
- `inertia/apps/user/modules/tasks/create.svelte`
- `inertia/apps/org/modules/tasks/create.svelte`
- `inertia/apps/user/modules/tasks/types/create_task_types.ts`
- `inertia/apps/org/modules/tasks/types/create_task_types.ts`
- `inertia/apps/user/modules/tasks/types/index.svelte.ts`
- `inertia/apps/org/modules/tasks/types/index.svelte.ts`
- `inertia/apps/user/modules/tasks/lib/create_prefill.ts`
- `inertia/apps/org/modules/tasks/lib/create_prefill.ts`
- `inertia/apps/user/modules/tasks/components/detail/task_role_prefill_panel.svelte`
- `inertia/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte`
- `inertia/apps/user/modules/tasks/components/skill_requirements_tab.svelte`
- `inertia/apps/org/modules/tasks/components/skill_requirements_tab.svelte`
- `inertia/apps/user/modules/tasks/components/task_skill_add_dialog.svelte`
- `inertia/apps/org/modules/tasks/components/task_skill_add_dialog.svelte`
- `inertia/apps/user/modules/tasks/components/task_skill_edit_dialog.svelte`
- `inertia/apps/org/modules/tasks/components/task_skill_edit_dialog.svelte`

Specific UI changes:

- Replace 3 category columns with 4.
- Change grid from `lg:grid-cols-3` to responsive 2/4 layout.
- Update type guards to accept `technology` and `engineering`, not `technical`.
- Update selected skill/level state initialization.
- Update labels:
  - Technology
  - Engineering
  - Soft Skill
  - Delivery

### Profile UI

Files to change:

- `inertia/apps/user/modules/profile/profile_view_helpers.ts`
- `inertia/apps/org/modules/profile/profile_view_helpers.ts`
- `inertia/apps/user/modules/profile/profile_theme.ts`
- `inertia/apps/org/modules/profile/profile_theme.ts`
- `inertia/apps/user/modules/profile/types.svelte.ts`
- `inertia/apps/org/modules/profile/types.svelte.ts`
- `inertia/apps/user/modules/profile/view.svelte`
- `inertia/apps/org/modules/profile/view.svelte`
- `inertia/apps/user/modules/profile/show.svelte`
- `inertia/apps/org/modules/profile/show.svelte`
- `inertia/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte`
- `inertia/apps/org/modules/profile/components/profile_skills_and_charts_section.svelte`
- `inertia/apps/user/modules/profile/components/profile_spider_chart_card.svelte`
- `inertia/apps/org/modules/profile/components/profile_spider_chart_card.svelte`
- `inertia/apps/user/modules/profile/components/skills_section.svelte`
- `inertia/apps/org/modules/profile/components/skills_section.svelte`
- `inertia/apps/user/modules/profile/components/skill_card.svelte`
- `inertia/apps/org/modules/profile/components/skill_card.svelte`
- `inertia/apps/user/modules/profile/components/add_skill_modal.svelte`
- `inertia/apps/org/modules/profile/components/add_skill_modal.svelte`
- `inertia/apps/user/modules/profile/components/profile_overview_section.svelte`
- `inertia/apps/org/modules/profile/components/profile_overview_section.svelte`

Specific UI changes:

- Replace `PROFILE_SKILL_GROUP_ORDER = ['technical', 'soft_skill', 'delivery']`.
- Replace `SpiderChartData` fields.
- Add profile styles for `technology` and `engineering`.
- Remove `technical` visual label.
- Decide whether profile radar remains category-level or changes to category inventory.

Recommended profile contract:

```ts
interface SkillCategoryGroup {
  code: SkillCategoryCode
  label: string
  points: SpiderChartPoint[]
}
```

This avoids another hardcoded response shape when taxonomy evolves.

### Review UI

Files to change:

- `inertia/apps/user/modules/reviews/components/spider_chart.utils.ts`
- `inertia/apps/org/modules/reviews/components/spider_chart.utils.ts`
- `inertia/apps/user/modules/reviews/components/spider_chart.svelte`
- `inertia/apps/org/modules/reviews/components/spider_chart.svelte`
- `inertia/apps/user/modules/reviews/components/spider_chart.types.ts`
- `inertia/apps/org/modules/reviews/components/spider_chart.types.ts`
- `inertia/apps/user/modules/reviews/components/skill_rating_item.svelte`
- `inertia/apps/org/modules/reviews/components/skill_rating_item.svelte`
- `inertia/apps/user/modules/reviews/components/skill_rating_form.svelte`
- `inertia/apps/org/modules/reviews/components/skill_rating_form.svelte`
- `inertia/apps/user/modules/reviews/types.svelte.ts`
- `inertia/apps/org/modules/reviews/types.svelte.ts`

Specific UI changes:

- Update category color logic.
- Update comments that say technical/soft/delivery.
- Skill rating badge should map category labels, not `replace('_', ' ')`.

### Marketplace And Talent UI

Files to change:

- `inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte`
- `inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte`
- `inertia/apps/user/modules/marketplace/types.svelte.ts`
- `inertia/apps/org/modules/marketplace/types.svelte.ts`
- `inertia/apps/org/modules/talents/index.svelte`
- `inertia/apps/org/modules/talents/show.svelte`
- `inertia/apps/user/modules/search/components/skill_search_combobox.svelte`
- `inertia/apps/org/modules/search/components/skill_search_combobox.svelte`

Specific UI changes:

- Add `technology` and `engineering` filter options.
- Remove `technical`.
- Update category label maps.
- Update test fixtures/stories.

### Admin UI

Files to verify/change:

- `inertia/apps/admin/modules/proficiency/rubric.svelte`

This currently displays `skill.categoryCode` as a badge. It does not validate category, but should use category label mapping for new taxonomy.

## Seed And Demo Data Changes

Files to change:

- `app/seed/demo_data/skill_seeder.ts`
  - Replace `skillSpecs`.
  - Add engineering/delivery seed skills.
  - Add rubrics for engineering and delivery representative skills.
  - Update professional role templates.
  - Update project skill catalog.
  - Update project professional role skills.
- `app/seed/demo_data/user_skills_specs.ts`
  - Add engineering/delivery user skill rows.
  - Ensure profile has all four categories.
- `app/seed/demo_data/domain_expertise_specs.ts`
  - Current tech stack frequency already has Redis/PostgreSQL/Svelte/TypeScript/Documentation.
  - Consider separating `technology` frequency from `engineering` signal later.
- `app/seed/demo_data/task_specs.ts`
  - Required skills must include all four categories if new task rule is enforced.
- `app/seed/demo_data/task_seeder.ts`
  - Skill-level defaults should not assume only leadership/problem_solving/communication special cases.
- `app/seed/demo_data/review_specs.ts`
  - Add engineering reviews for OOP/API Design/System Design/Clean Code.
  - Add delivery reviews for Planning/Release/Risk/Documentation.
- `app/seed/demo_data/user_skill_seeder.ts`
  - No logic change, but seeded specs change.
- `app/seed/demo_data/task_submission_seeder.ts`
  - Snapshot of required skills should reflect new categories.
- `app/seed/demo_data/review_data_seeder.ts`
  - No logic change expected, but review specs change.
- `app/seed/demo_data/seed_utils.ts`
  - No taxonomy logic found, but cleanup touches skills.

Recommended seeded role examples:

- Frontend Engineer:
  - Technology: React, TypeScript, Svelte
  - Engineering: Design System, Accessibility, Clean Code
  - Soft Skill: Communication
  - Delivery: Documentation or Estimation
- Backend Engineer:
  - Technology: Node.js, TypeScript, PostgreSQL
  - Engineering: API Design, Data Modelling, System Design
  - Soft Skill: Problem Solving
  - Delivery: Risk Tracking
- QA/Reviewer:
  - Engineering: Testing Strategy, Code Review
  - Delivery: Release Management, Documentation
  - Soft Skill: Communication

## Tests To Update/Add

Backend tests:

- `app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts`
- `app/modules/tasks/tests/backend/support/create_task_scenario.ts`
- `app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_skill_requirement_service.spec.ts`
- `app/modules/tasks/tests/backend/contract/task_requirements_api_standardization.contract.spec.ts`
- `app/modules/tasks/tests/backend/contract/task_applications.contract.spec.ts`
- `app/modules/tasks/tests/backend/integration/application_match_score.spec.ts`
- `app/modules/tasks/tests/backend/integration/list_tasks.spec.ts`
- `app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts`
- `app/modules/skills/tests/backend/unit/get_active_skills_query.spec.ts`
- `app/modules/skills/tests/backend/contract/skills_v1_read_api_standardization.contract.spec.ts`
- `app/modules/skills/tests/backend/contract/skills_v1_mutation_api_standardization.contract.spec.ts`
- `app/modules/skills/tests/backend/integration/skill_search_engine.spec.ts`
- `app/modules/skills/tests/backend/integration/project_skill_service.spec.ts`
- `app/modules/search/tests/backend/unit/skill_document_builder.spec.ts`
- `app/modules/search/tests/backend/integration/global_search_api.spec.ts`
- `app/modules/users/tests/backend/integration/user_skills.spec.ts`
- `app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts`
- `app/modules/users/tests/backend/unit/profile_metrics_rules.spec.ts`
- `app/modules/users/tests/backend/integration/talent_search.spec.ts`
- `app/modules/users/tests/backend/integration/talent_search_engine.spec.ts`
- `app/modules/users/tests/backend/integration/talent_directory_access_and_filters.spec.ts`
- `app/modules/users/tests/backend/integration/recruiter_bookmarks_workspace.spec.ts`
- `app/modules/users/tests/backend/integration/user_profile.spec.ts`
- `app/modules/users/tests/backend/integration/publish_user_profile_snapshot.spec.ts`
- `app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts`
- `app/modules/marketplace/tests/backend/integration/public_task_search_engine.spec.ts`
- `app/modules/projects/tests/backend/contract/project_staffing_candidates_api_standardization.contract.spec.ts`
- `app/modules/projects/tests/backend/integration/project_member_candidates_http_standardization.spec.ts`
- `app/modules/organizations/tests/backend/integration/get_organization_dashboard_stats_query.spec.ts`
- `app/modules/reviews/tests/backend/integration/spider_chart.spec.ts`
- `app/modules/reviews/tests/backend/support/submit_review_scenario.ts`
- `app/modules/admin/tests/backend/integration/admin_api_standardization.spec.ts`
- `app/modules/admin/tests/backend/integration/flagged_reviews.spec.ts`

Frontend tests:

- `inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts`
- `inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts`
- `inertia/apps/user/tests/modules/tasks/components/modals/create_task_form.test.ts`
- `inertia/apps/org/tests/modules/tasks/components/modals/create_task_form.test.ts`
- `inertia/apps/user/tests/modules/tasks/components/modals/create_task_modal.test.ts`
- `inertia/apps/org/tests/modules/tasks/components/modals/create_task_modal.test.ts`
- `inertia/apps/user/tests/modules/tasks/components/task_role_prefill_panel.test.ts`
- `inertia/apps/org/tests/modules/tasks/components/task_role_prefill_panel.test.ts`
- `inertia/apps/user/tests/modules/profile/profile_chart_summary.test.ts`
- `inertia/apps/user/tests/modules/profile/show.test.ts`
- `inertia/apps/org/tests/modules/talents/index.test.ts`
- `inertia/apps/org/tests/modules/talents/show.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_overview_section.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_stats.test.ts`
- `inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts`
- `inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts`
- `inertia/apps/org/tests/e2e/projects/project_operating_model_task_inheritance.spec.ts`
- `inertia/apps/user/tests/storybook/modules/search/skill_search_combobox.stories.svelte`
- `inertia/apps/org/tests/storybook/modules/tasks/task_skills_field.stories.svelte`

Shared factory:

- `tests/helpers/factories/review_skill.ts`
  - Decide default `SkillFactory.category_code`.
  - Recommended default: `technology`, because most existing tests create generic tech-stack-like skills.
  - Add explicit factory helper for each category if useful.

## Docs And Diagrams

Files to change:

- `docs_AI/Suar_Project_Knowledge_Base_EN_v5.md`
- `docs_AI/Suar_Project_Knowledge_Base_VI_v4.md`
- `docs_AI/Suar_Capability_Model_v6_VI.md`
- `docs_AI/suar.sql`
- `docs/06-data/metric-dashboard-report-analysis.md`
- `docs/06-data/database-design-erd-data-dictionary.md`
- `docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd`
- `docs/11-diagrams/ERD/01-user-auth-skills/README.md`
- `docs/11-diagrams/Class/02-task/README.md`
- `docs/11-diagrams/Action/07-profile-skills/high-level/act_07b_skill_management.mmd`
- `docs/11-diagrams/Sequence/09-profile-skills/high-level/seq_09a_profile_views_skills.mmd`
- `docs/superpowers/mockups/profile-dossier-mvp/index.html`
- `docs/superpowers/mockups/profile-dossier-mvp/script.js`
- `docs/superpowers/mockups/profile-dossier-mvp/styles.css`

Doc changes:

- Replace "Technical" top-level with "Technology" and "Engineering".
- Move API design/testing/security/data modelling examples under Engineering.
- Move React/PostgreSQL/Redis/languages/frameworks under Technology.
- Update task skill mix documentation.
- Update profile chart docs and mockup.

## Generated Declarations

Do not hand-edit unless this repo intentionally commits generated declarations. Regenerate after TypeScript build/typegen:

- `docs_AI/declarations/app/modules/tasks/actions/support/task_required_skill_category_rules.d.ts`
- `docs_AI/declarations/app/modules/users/actions/queries/get_spider_chart_data_query.d.ts`
- `docs_AI/declarations/app/modules/users/actions/queries/get_profile_show_page_query.d.ts`
- `docs_AI/declarations/app/modules/users/actions/queries/get_profile_view_page_query.d.ts`
- `docs_AI/declarations/app/modules/users/controllers/mappers/request/user_request_mapper.d.ts`
- `docs_AI/declarations_inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.d.ts`
- `docs_AI/declarations_inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.d.ts`
- `docs_AI/declarations_inertia/apps/user/modules/profile/types.svelte.d.ts`
- `docs_AI/declarations_inertia/apps/org/modules/profile/types.svelte.d.ts`
- `docs_AI/declarations_inertia/apps/user/modules/profile/profile_view_helpers.d.ts`
- `docs_AI/declarations_inertia/apps/org/modules/profile/profile_view_helpers.d.ts`

## Full Focus File List From Audit

`rg` focus scan found 78 files with old category/spider/task-rule references, excluding broad generated skeletons:

```text
app/modules/marketplace/tests/backend/integration/marketplace_routes.spec.ts
app/modules/reviews/README.md
app/modules/reviews/actions/commands/calculate_spider_chart_command.ts
app/modules/search/tests/backend/unit/skill_document_builder.spec.ts
app/modules/skills/tests/backend/contract/skills_v1_mutation_api_standardization.contract.spec.ts
app/modules/skills/tests/backend/contract/skills_v1_read_api_standardization.contract.spec.ts
app/modules/tasks/actions/support/task_required_skill_category_rules.ts
app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts
app/modules/tasks/tests/backend/support/create_task_scenario.ts
app/modules/users/README.md
app/modules/users/actions/queries/get_profile_show_page_query.ts
app/modules/users/actions/queries/get_profile_view_page_query.ts
app/modules/users/actions/queries/get_spider_chart_data_query.ts
app/modules/users/constants/user_constants.ts
app/modules/users/controllers/mappers/request/user_request_mapper.ts
app/modules/users/tests/backend/integration/user_skills.spec.ts
app/modules/users/tests/backend/unit/profile_metrics_rules.spec.ts
app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts
docs/06-data/metric-dashboard-report-analysis.md
docs/11-diagrams/Action/07-profile-skills/high-level/act_07b_skill_management.mmd
docs/11-diagrams/Class/02-task/README.md
docs/11-diagrams/ERD/01-user-auth-skills/overview/logical_erd_01_user_auth_skills.mmd
docs/11-diagrams/ERD/01-user-auth-skills/README.md
docs/11-diagrams/Sequence/09-profile-skills/high-level/seq_09a_profile_views_skills.mmd
docs_AI/declarations/app/modules/tasks/actions/support/task_required_skill_category_rules.d.ts
docs_AI/declarations/app/modules/users/actions/queries/get_profile_show_page_query.d.ts
docs_AI/declarations/app/modules/users/actions/queries/get_profile_view_page_query.d.ts
docs_AI/declarations/app/modules/users/actions/queries/get_spider_chart_data_query.d.ts
docs_AI/declarations/app/modules/users/controllers/mappers/request/user_request_mapper.d.ts
docs_AI/declarations_inertia/apps/org/modules/profile/profile_view_helpers.d.ts
docs_AI/declarations_inertia/apps/org/modules/profile/types.svelte.d.ts
docs_AI/declarations_inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.d.ts
docs_AI/declarations_inertia/apps/user/modules/profile/profile_view_helpers.d.ts
docs_AI/declarations_inertia/apps/user/modules/profile/types.svelte.d.ts
docs_AI/declarations_inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.d.ts
inertia/apps/org/modules/profile/components/profile_skills_and_charts_section.svelte
inertia/apps/org/modules/profile/components/profile_spider_chart_card.svelte
inertia/apps/org/modules/profile/profile_view_helpers.ts
inertia/apps/org/modules/profile/show.svelte
inertia/apps/org/modules/profile/types.svelte.ts
inertia/apps/org/modules/profile/view.svelte
inertia/apps/org/modules/reviews/components/spider_chart.svelte
inertia/apps/org/modules/reviews/components/spider_chart.utils.ts
inertia/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte
inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.ts
inertia/apps/org/tests/e2e/projects/project_operating_model_task_inheritance.spec.ts
inertia/apps/org/tests/modules/projects/project_operating_model_tab.test.ts
inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts
inertia/apps/org/tests/modules/talents/index.test.ts
inertia/apps/org/tests/modules/talents/show.test.ts
inertia/apps/org/tests/modules/tasks/components/modals/create_task_form.test.ts
inertia/apps/org/tests/modules/tasks/components/modals/create_task_modal.test.ts
inertia/apps/org/tests/modules/tasks/components/task_role_prefill_panel.test.ts
inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts
inertia/apps/org/tests/storybook/modules/tasks/task_skills_field.stories.svelte
inertia/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte
inertia/apps/user/modules/profile/components/profile_spider_chart_card.svelte
inertia/apps/user/modules/profile/profile_view_helpers.ts
inertia/apps/user/modules/profile/show.svelte
inertia/apps/user/modules/profile/types.svelte.ts
inertia/apps/user/modules/profile/view.svelte
inertia/apps/user/modules/reviews/components/spider_chart.svelte
inertia/apps/user/modules/reviews/components/spider_chart.utils.ts
inertia/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte
inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.ts
inertia/apps/user/tests/modules/profile/components/profile_overview_section.test.ts
inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts
inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts
inertia/apps/user/tests/modules/profile/components/profile_stats.test.ts
inertia/apps/user/tests/modules/profile/profile_chart_summary.test.ts
inertia/apps/user/tests/modules/profile/show.test.ts
inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts
inertia/apps/user/tests/modules/tasks/components/modals/create_task_form.test.ts
inertia/apps/user/tests/modules/tasks/components/modals/create_task_modal.test.ts
inertia/apps/user/tests/modules/tasks/components/task_role_prefill_panel.test.ts
inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts
inertia/apps/user/tests/storybook/modules/search/skill_search_combobox.stories.svelte
tests/helpers/factories/review_skill.ts
```

Additional files found by broader review but not always matched by the focused literal scan:

```text
database/schema.ts
docs_AI/suar.sql
app/modules/skills/infra/models/skill.ts
app/modules/skills/constants/skill_constants.ts
app/modules/skills/actions/ports/skill_external_dependencies.ts
app/modules/skills/actions/ports/skill_external_dependencies_impl.ts
app/modules/skills/actions/queries/get_active_skills_query.ts
app/modules/skills/actions/queries/list_active_skills_catalog_query.ts
app/modules/skills/infra/repositories/skill_repository.ts
app/modules/skills/infra/repositories/read/skill_queries.ts
app/modules/skills/application/ports/skill_search_document_reader.ts
app/modules/skills/infra/adapters/lucid_skill_search_document_reader.ts
app/modules/search/domain/skill_search_document.ts
app/modules/search/infra/skills/skill_search_document_builder.ts
app/modules/search/infra/skills/skill_search_index_repository.ts
app/modules/search/actions/queries/global_search/entity_result_mapper.ts
app/modules/tasks/actions/support/task_required_skill_persistence.ts
app/modules/tasks/actions/services/task_skill_requirement_service.ts
app/modules/tasks/actions/queries/get_task_metadata_query.ts
app/modules/tasks/actions/ports/task_external_dependencies.ts
app/modules/tasks/bootstrap/adapters/monolith_task_skill_reader.ts
app/modules/tasks/controllers/v1/get_role_requirements_controller.ts
app/modules/users/actions/queries/get_user_skills_query.ts
app/modules/users/infra/repositories/read/analytics_queries.ts
app/modules/users/infra/repositories/read/types.ts
app/modules/users/actions/queries/search_talents_query.ts
app/modules/users/bootstrap/user_query_factory.ts
app/modules/users/actions/ports/user_external_dependencies.ts
app/modules/users/actions/ports/user_external_dependencies_impl.ts
app/modules/users/actions/commands/publish_user_profile_snapshot_command.ts
app/modules/users/actions/support/user_query_cache_keys.ts
app/modules/users/domain/profile_metrics_types.ts
app/modules/users/types/user_records.ts
app/seed/demo_data/skill_seeder.ts
app/seed/demo_data/user_skills_specs.ts
app/seed/demo_data/domain_expertise_specs.ts
app/seed/demo_data/task_specs.ts
app/seed/demo_data/task_seeder.ts
app/seed/demo_data/review_specs.ts
app/seed/demo_data/user_skill_seeder.ts
app/seed/demo_data/task_submission_seeder.ts
app/seed/demo_data/review_data_seeder.ts
start/routes/testing.ts
inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte
inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte
inertia/apps/user/modules/marketplace/types.svelte.ts
inertia/apps/org/modules/marketplace/types.svelte.ts
inertia/apps/org/modules/talents/index.svelte
inertia/apps/org/modules/talents/show.svelte
inertia/apps/user/modules/search/components/skill_search_combobox.svelte
inertia/apps/org/modules/search/components/skill_search_combobox.svelte
inertia/apps/admin/modules/proficiency/rubric.svelte
```

## Implementation Order

1. Add canonical skill category constants in skills module.
2. Add DB migration and data migration for existing rows.
3. Update seed skill catalog and testing route seed helpers.
4. Update backend task category rules and tests.
5. Update backend profile/spider category contract.
6. Update user/org task create UI.
7. Update user/org profile UI.
8. Update marketplace/talent/search category filters.
9. Update review chart colors/badges.
10. Update docs/diagrams/mockup.
11. Regenerate declarations/schema artifacts.
12. Reindex skill search.
13. Run backend unit/integration tests around skills/tasks/users/search/marketplace.
14. Run frontend tests around task create/profile/marketplace/talent filters.
15. Run `gitnexus detect-changes` before commit.

## Verification Checklist

Minimum verification before merge:

- DB migration succeeds on `suar_test`.
- `select distinct category_code from skills` returns only `technology`, `engineering`, `soft_skill`, `delivery`.
- No persisted `technical` remains.
- Task create accepts one skill in each new category.
- Task create rejects missing technology/engineering/soft_skill/delivery.
- Profile shows four groups.
- Marketplace skill category filter includes four groups.
- Org talent filter includes four groups.
- Search can find "engineering" skills and "technology" skills.
- Seed creates at least one reviewed user skill in each group.
- Generated declarations match updated contracts.

## Risks

- Existing task required skill rule may become too strict if set to 2 each.
- Existing profile chart shape is brittle; category-array contract is safer than adding more fixed fields.
- `Testing & QA` and `Code Review` category move will change historical profile/task grouping.
- Search index must be rebuilt or category search behavior will lag.
- User/org Inertia duplication creates high chance of one surface being missed.
- Existing staged unrelated changes prevent safe automatic commit of this spec.

## Self-Review Notes

- No placeholder requirements.
- The top-level taxonomy is explicit and matches the requested four groups.
- L0-L14 remains unchanged.
- DB, backend, frontend, tests, seeds, testing routes, docs, diagrams, and generated declarations are covered.
- Remaining product choice is not a missing spec item: task category minimum is recommended as 1 per group and explicitly contrasted with 2 per group.
