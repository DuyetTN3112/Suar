# Skill Taxonomy Four Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Suar skill taxonomy from `technical | soft_skill | delivery` to `technology | engineering | soft_skill | delivery` across DB, backend, seed data, frontend, tests, and docs.

**Architecture:** Put canonical skill category definitions in the skills module, then make tasks, users, search, and frontend surfaces consume that single contract. Migrate persisted `skills.category_code` data with an explicit DB migration. Keep L0-L14 proficiency unchanged.

**Tech Stack:** AdonisJS/Lucid/PostgreSQL backend, Svelte/Inertia frontend, Japa backend tests, Vitest/Svelte frontend tests, GitNexus CLI.

## Global Constraints

- Old `technical` category is removed from canonical taxonomy.
- Canonical top-level categories are exactly `technology`, `engineering`, `soft_skill`, `delivery`.
- Existing `soft_skill` stays unchanged.
- Existing tech-stack skills move from `technical` to `technology`.
- Existing `testing` and `code_review` skills move from `delivery` to `engineering`.
- Task required-skill minimum becomes one skill per category.
- L0-L14 proficiency scale stays unchanged.
- Run `gitnexus impact <symbolName>` before modifying any function, class, method, or exported symbol.
- Run `gitnexus detect-changes` before any commit.
- Do not commit unrelated staged or unstaged changes.

---

## File Structure

Create:

- `database/migrations/20260718150000_migrate_skill_categories_to_four_groups.ts`

Modify:

- `app/modules/skills/constants/skill_constants.ts`: canonical category enum, labels, order, options.
- `app/modules/skills/infra/models/skill.ts`: model comment.
- `app/modules/users/constants/user_constants.ts`: remove duplicated skill category enum/options, re-export from skills if needed.
- `app/modules/tasks/actions/support/task_required_skill_category_rules.ts`: backend task mix rule.
- `inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.ts`: user frontend task mix rule.
- `inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.ts`: org frontend task mix rule.
- `app/modules/users/actions/queries/get_spider_chart_data_query.ts`: backend profile category result shape.
- `inertia/apps/user/modules/profile/profile_view_helpers.ts`: user profile group order and fallback group creation.
- `inertia/apps/org/modules/profile/profile_view_helpers.ts`: org profile group order and fallback group creation.
- `inertia/apps/user/modules/profile/types.svelte.ts`: user profile spider/category data type.
- `inertia/apps/org/modules/profile/types.svelte.ts`: org profile spider/category data type.
- `inertia/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte`: user profile chart cards.
- `inertia/apps/org/modules/profile/components/profile_skills_and_charts_section.svelte`: org profile chart cards.
- `inertia/apps/user/modules/profile/components/profile_spider_chart_card.svelte`: category prop type.
- `inertia/apps/org/modules/profile/components/profile_spider_chart_card.svelte`: category prop type.
- `inertia/apps/user/modules/profile/profile_theme.ts`: user profile category labels/styles.
- `inertia/apps/org/modules/profile/profile_theme.ts`: org profile category labels/styles.
- `inertia/apps/user/modules/profile/show.svelte`: fallback grouped categories.
- `inertia/apps/org/modules/profile/show.svelte`: fallback grouped categories.
- `inertia/apps/user/modules/profile/view.svelte`: fallback grouped categories.
- `inertia/apps/org/modules/profile/view.svelte`: fallback grouped categories.
- `inertia/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte`: user task category columns.
- `inertia/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte`: org task category columns.
- `inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte`: user marketplace filters.
- `inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte`: org marketplace filters.
- `inertia/apps/org/modules/talents/index.svelte`: org talent category labels/filter.
- `inertia/apps/user/modules/reviews/components/spider_chart.utils.ts`: user review chart colors.
- `inertia/apps/org/modules/reviews/components/spider_chart.utils.ts`: org review chart colors.
- `inertia/apps/user/modules/reviews/components/spider_chart.svelte`: comment/copy.
- `inertia/apps/org/modules/reviews/components/spider_chart.svelte`: comment/copy.
- `app/seed/demo_data/skill_seeder.ts`: category migration in seeds and new seed skills.
- `app/seed/demo_data/task_specs.ts`: required skill coverage.
- `app/seed/demo_data/user_skills_specs.ts`: user skill coverage.
- `app/seed/demo_data/review_specs.ts`: review coverage.
- `start/routes/testing.ts`: test seed category coverage.
- `tests/helpers/factories/review_skill.ts`: default category.
- `docs_AI/suar.sql`: documented DB CHECK.
- `docs/11-diagrams/ERD/logical_erd_01_user_auth_skills.mmd`: category documentation.
- `docs/11-diagrams/ERD/physical_inventory_01_user_auth_skills.mmd`: category documentation.
- `docs/11-diagrams/Class/cls_02b_skill.mmd`: category documentation.

Test:

- `app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts`
- `app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts`
- `app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts`
- `app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts`
- `app/modules/users/tests/backend/integration/user_skills.spec.ts`
- `app/modules/skills/tests/backend/contract/skills_v1_read_api_standardization.contract.spec.ts`
- `app/modules/skills/tests/backend/contract/skills_v1_mutation_api_standardization.contract.spec.ts`
- `inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts`
- `inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts`
- `inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts`
- `inertia/apps/org/tests/modules/talents/index.test.ts`
- `inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts`
- `inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts`

---

### Task 1: Canonical Skill Category Contract

**Files:**

- Modify: `app/modules/skills/constants/skill_constants.ts`
- Modify: `app/modules/users/constants/user_constants.ts`
- Modify: `app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts`
- Modify: `app/modules/skills/tests/backend/unit/get_active_skills_query.spec.ts`

**Interfaces:**

- Produces:
  - `SkillCategoryCode`
  - `SKILL_CATEGORY_CODES`
  - `SKILL_CATEGORY_ORDER`
  - `SKILL_CATEGORY_LABELS`
  - `SKILL_CATEGORY_DISPLAY_CONFIG`
  - `skillCategoryOptions`
  - `isSkillCategoryCode(value: unknown): value is SkillCategoryCode`
- Consumes:
  - Existing `SKILL_DISPLAY_TYPES`

- [x] **Step 1: Run impact checks**

Run:

```bash
gitnexus impact SkillCategoryCode
gitnexus impact skillCategoryOptions
gitnexus impact SKILL_DISPLAY_TYPES
```

Expected:

```text
risk: MEDIUM or lower for old category symbols
```

If GitNexus reports HIGH or CRITICAL, stop and report affected symbols before editing.

- [x] **Step 2: Write failing invariant test**

Replace category assertions in `app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts` with:

```ts
import {
  SkillCategoryCode,
  SKILL_CATEGORY_ORDER,
  skillCategoryOptions,
} from '#modules/skills/constants/skill_constants'

assert.deepEqual(SKILL_CATEGORY_ORDER, [
  SkillCategoryCode.TECHNOLOGY,
  SkillCategoryCode.ENGINEERING,
  SkillCategoryCode.SOFT_SKILL,
  SkillCategoryCode.DELIVERY,
])

assert.deepEqual(
  skillCategoryOptions.map((option) => option.value),
  ['technology', 'engineering', 'soft_skill', 'delivery']
)

const technologyOption = skillCategoryOptions.find(
  (option) => option.value === SkillCategoryCode.TECHNOLOGY
)
const engineeringOption = skillCategoryOptions.find(
  (option) => option.value === SkillCategoryCode.ENGINEERING
)
const deliveryOption = skillCategoryOptions.find(
  (option) => option.value === SkillCategoryCode.DELIVERY
)

assert.equal(technologyOption?.labelVi, 'Công nghệ')
assert.equal(engineeringOption?.labelVi, 'Kỹ thuật phần mềm')
assert.equal(deliveryOption?.displayType, 'spider_chart')
```

- [x] **Step 3: Verify RED**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts
```

Expected:

```text
FAIL because SkillCategoryCode is not exported from skills/constants/skill_constants
```

- [x] **Step 4: Implement canonical constants**

Add to `app/modules/skills/constants/skill_constants.ts`:

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

export const SKILL_CATEGORY_CODES = [...SKILL_CATEGORY_ORDER]

export type SkillCategoryCodeValue = (typeof SKILL_CATEGORY_ORDER)[number]

export const SKILL_CATEGORY_LABELS: Record<
  SkillCategoryCodeValue,
  { label: string; labelVi: string }
> = {
  [SkillCategoryCode.TECHNOLOGY]: { label: 'Technology', labelVi: 'Công nghệ' },
  [SkillCategoryCode.ENGINEERING]: { label: 'Engineering', labelVi: 'Kỹ thuật phần mềm' },
  [SkillCategoryCode.SOFT_SKILL]: { label: 'Soft Skill', labelVi: 'Kỹ năng mềm' },
  [SkillCategoryCode.DELIVERY]: { label: 'Delivery', labelVi: 'Thực thi' },
}

export const SKILL_CATEGORY_DISPLAY_CONFIG = {
  [SkillCategoryCode.TECHNOLOGY]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.TECHNOLOGY],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.ENGINEERING]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.ENGINEERING],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.SOFT_SKILL]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.SOFT_SKILL],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
  [SkillCategoryCode.DELIVERY]: {
    ...SKILL_CATEGORY_LABELS[SkillCategoryCode.DELIVERY],
    displayType: SKILL_DISPLAY_TYPES.SPIDER_CHART,
  },
} satisfies Record<SkillCategoryCodeValue, { label: string; labelVi: string; displayType: string }>

export const skillCategoryOptions = SKILL_CATEGORY_ORDER.map((value) => ({
  value,
  ...SKILL_CATEGORY_DISPLAY_CONFIG[value],
}))

export function isSkillCategoryCode(value: unknown): value is SkillCategoryCodeValue {
  return typeof value === 'string' && SKILL_CATEGORY_CODES.includes(value as SkillCategoryCodeValue)
}
```

Replace category exports in `app/modules/users/constants/user_constants.ts` with imports/re-exports:

```ts
export {
  SkillCategoryCode,
  SKILL_CATEGORY_CODES,
  SKILL_CATEGORY_DISPLAY_CONFIG,
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  isSkillCategoryCode,
  skillCategoryOptions,
  type SkillCategoryCodeValue,
} from '#modules/skills/constants/skill_constants'
```

- [x] **Step 5: Verify GREEN**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts app/modules/skills/tests/backend/unit/get_active_skills_query.spec.ts
```

Expected:

```text
PASS
```

---

### Task 2: Backend Task Required Skill Category Rule

**Files:**

- Modify: `app/modules/tasks/actions/support/task_required_skill_category_rules.ts`
- Modify: `app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts`
- Modify: `app/modules/tasks/tests/backend/support/create_task_scenario.ts`

**Interfaces:**

- Consumes: `SkillCategoryCode`, `SKILL_CATEGORY_ORDER`, `SKILL_CATEGORY_LABELS`, `isSkillCategoryCode`
- Produces:
  - `TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS`
  - `TaskRequiredSkillCategory`
  - `TaskRequiredSkillCategoryCounts`
  - `countTaskRequiredSkillCategories(categories)`
  - `getTaskRequiredSkillCategoryViolations(counts)`
  - `formatTaskRequiredSkillCategoryViolations(violations)`

- [x] **Step 1: Run impact checks**

Run:

```bash
gitnexus impact TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS
gitnexus impact countTaskRequiredSkillCategories
gitnexus impact getTaskRequiredSkillCategoryViolations
gitnexus impact formatTaskRequiredSkillCategoryViolations
```

Expected:

```text
risk: MEDIUM or lower
```

- [x] **Step 2: Write failing tests**

Replace `app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts` with:

```ts
import { test } from '@japa/runner'

import {
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/actions/support/task_required_skill_category_rules'

test.group('Task required skill category rules', () => {
  test('counts all four skill category groups', ({ assert }) => {
    const counts = countTaskRequiredSkillCategories([
      'technology',
      'engineering',
      'engineering',
      'soft_skill',
      'delivery',
      'technical',
      null,
      undefined,
    ])

    assert.deepEqual(counts, {
      technology: 1,
      engineering: 2,
      soft_skill: 1,
      delivery: 1,
    })
  })

  test('flags missing category minimums across four skill groups', ({ assert }) => {
    const counts = countTaskRequiredSkillCategories(['technology', 'engineering', 'soft_skill'])

    const violations = getTaskRequiredSkillCategoryViolations(counts)

    assert.deepEqual(violations, [{ category: 'delivery', actual: 0, minimum: 1 }])
    assert.include(formatTaskRequiredSkillCategoryViolations(violations), 'Thực thi 0/1')
    assert.include(
      formatTaskRequiredSkillCategoryViolations(violations),
      'Mỗi task phải có ít nhất 1 skill cho từng nhóm năng lực'
    )
  })
})
```

- [x] **Step 3: Verify RED**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts
```

Expected:

```text
FAIL because counts still use technical/soft_skill/delivery with minimum 2
```

- [x] **Step 4: Implement rule**

Replace `app/modules/tasks/actions/support/task_required_skill_category_rules.ts` with:

```ts
import {
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
  type SkillCategoryCodeValue,
  isSkillCategoryCode,
} from '#modules/skills/constants/skill_constants'

export const TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS = {
  technology: 1,
  engineering: 1,
  soft_skill: 1,
  delivery: 1,
} as const satisfies Record<SkillCategoryCodeValue, number>

export type TaskRequiredSkillCategory = keyof typeof TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS

export type TaskRequiredSkillCategoryCounts = Record<TaskRequiredSkillCategory, number>

export interface TaskRequiredSkillCategoryViolation {
  category: TaskRequiredSkillCategory
  actual: number
  minimum: number
}

export function createEmptyTaskRequiredSkillCategoryCounts(): TaskRequiredSkillCategoryCounts {
  return {
    technology: 0,
    engineering: 0,
    soft_skill: 0,
    delivery: 0,
  }
}

export function countTaskRequiredSkillCategories(
  categories: Array<string | null | undefined>
): TaskRequiredSkillCategoryCounts {
  const counts = createEmptyTaskRequiredSkillCategoryCounts()

  for (const category of categories) {
    if (isSkillCategoryCode(category)) {
      counts[category] += 1
    }
  }

  return counts
}

export function getTaskRequiredSkillCategoryViolations(
  counts: TaskRequiredSkillCategoryCounts
): TaskRequiredSkillCategoryViolation[] {
  return SKILL_CATEGORY_ORDER.filter(
    (category) => counts[category] < TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS[category]
  ).map((category) => ({
    category,
    actual: counts[category],
    minimum: TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS[category],
  }))
}

export function formatTaskRequiredSkillCategoryViolations(
  violations: TaskRequiredSkillCategoryViolation[]
): string {
  const details = violations
    .map((violation) => {
      const label = SKILL_CATEGORY_LABELS[violation.category].labelVi
      return `${label} ${violation.actual}/${violation.minimum}`
    })
    .join(', ')

  return `Mỗi task phải có ít nhất ${TASK_REQUIRED_SKILL_CATEGORY_MINIMUMS.technology} skill cho từng nhóm năng lực. Thiếu: ${details}.`
}
```

Update `app/modules/tasks/tests/backend/support/create_task_scenario.ts` default skill creation to one category each:

```ts
SkillFactory.create({ category_code: 'technology' })
SkillFactory.create({ category_code: 'engineering' })
SkillFactory.create({ category_code: 'soft_skill' })
SkillFactory.create({ category_code: 'delivery' })
```

- [x] **Step 5: Verify GREEN**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts
```

Expected:

```text
PASS
```

---

### Task 3: Frontend Task Category Rule

**Files:**

- Modify: `inertia/apps/user/modules/tasks/lib/rules/task_skill_category_rules.ts`
- Modify: `inertia/apps/org/modules/tasks/lib/rules/task_skill_category_rules.ts`
- Modify: `inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts`
- Modify: `inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts`

**Interfaces:**

- Produces frontend `TaskSkillCategoryCode = 'technology' | 'engineering' | 'soft_skill' | 'delivery'`.
- Produces `TASK_SKILL_CATEGORY_ORDER` in the same order.

- [x] **Step 1: Run impact checks**

Run:

```bash
gitnexus impact TASK_SKILL_CATEGORY_MINIMUMS
gitnexus impact countTaskSkillsByCategory
gitnexus impact formatTaskSkillCategoryViolations
```

Expected:

```text
risk: MEDIUM or lower
```

- [x] **Step 2: Write failing frontend test**

In both user and org `task_skills_field.test.ts`, use required and available skills like:

```ts
requiredSkills: [
  {
    id: 'skill-1',
    name: 'API Design',
    level: 'l7',
    categoryCode: 'engineering',
    minimum_level_id: 'level-min',
    target_level_id: 'level-target',
    assessment_ceiling_level_id: 'level-ceiling',
    is_mandatory: true,
    importance: 'critical',
    weight: 1.5,
    requirement_source: 'professional_role_prefill',
    requirement_notes: 'Inherited from Backend Lead role baseline.',
  },
],
availableSkills: [
  { id: 'skill-1', name: 'API Design', categoryCode: 'engineering' },
  { id: 'skill-2', name: 'TypeScript', categoryCode: 'technology' },
  { id: 'skill-3', name: 'Collaboration', categoryCode: 'soft_skill' },
  { id: 'skill-4', name: 'Release Planning', categoryCode: 'delivery' },
],
```

Assert:

```ts
expect(screen.getAllByText('Công nghệ').length).toBeGreaterThan(0)
expect(screen.getAllByText('Kỹ thuật phần mềm').length).toBeGreaterThan(0)
expect(screen.getAllByText('Kỹ năng mềm').length).toBeGreaterThan(0)
expect(screen.getAllByText('Thực thi').length).toBeGreaterThan(0)
```

- [x] **Step 3: Verify RED**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts
```

Expected:

```text
FAIL because frontend rules reject technology and engineering
```

- [x] **Step 4: Implement frontend rules**

Replace both user and org `task_skill_category_rules.ts` with:

```ts
export const TASK_SKILL_CATEGORY_MINIMUMS = {
  technology: 1,
  engineering: 1,
  soft_skill: 1,
  delivery: 1,
} as const

export type TaskSkillCategoryCode = keyof typeof TASK_SKILL_CATEGORY_MINIMUMS

export type TaskSkillCategoryCounts = Record<TaskSkillCategoryCode, number>

export interface TaskSkillCategoryViolation {
  category: TaskSkillCategoryCode
  actual: number
  minimum: number
}

export const TASK_SKILL_CATEGORY_LABELS: Record<TaskSkillCategoryCode, string> = {
  technology: 'Công nghệ',
  engineering: 'Kỹ thuật phần mềm',
  soft_skill: 'Kỹ năng mềm',
  delivery: 'Thực thi',
}

export const TASK_SKILL_CATEGORY_ORDER: TaskSkillCategoryCode[] = [
  'technology',
  'engineering',
  'soft_skill',
  'delivery',
]

export function isTaskSkillCategoryCode(value: unknown): value is TaskSkillCategoryCode {
  return (
    value === 'technology' ||
    value === 'engineering' ||
    value === 'soft_skill' ||
    value === 'delivery'
  )
}

export function createEmptyTaskSkillCategoryCounts(): TaskSkillCategoryCounts {
  return {
    technology: 0,
    engineering: 0,
    soft_skill: 0,
    delivery: 0,
  }
}

export function countTaskSkillsByCategory(
  categoryCodes: Array<string | null | undefined>
): TaskSkillCategoryCounts {
  const counts = createEmptyTaskSkillCategoryCounts()

  for (const categoryCode of categoryCodes) {
    if (isTaskSkillCategoryCode(categoryCode)) {
      counts[categoryCode] += 1
    }
  }

  return counts
}

export function getTaskSkillCategoryViolations(
  counts: TaskSkillCategoryCounts
): TaskSkillCategoryViolation[] {
  return TASK_SKILL_CATEGORY_ORDER.filter(
    (category) => counts[category] < TASK_SKILL_CATEGORY_MINIMUMS[category]
  ).map((category) => ({
    category,
    actual: counts[category],
    minimum: TASK_SKILL_CATEGORY_MINIMUMS[category],
  }))
}

export function formatTaskSkillCategoryViolations(
  violations: TaskSkillCategoryViolation[]
): string {
  const details = violations
    .map(
      (violation) =>
        `${TASK_SKILL_CATEGORY_LABELS[violation.category]} ${violation.actual}/${violation.minimum}`
    )
    .join(', ')

  return `Mỗi nhóm skill phải có ít nhất ${TASK_SKILL_CATEGORY_MINIMUMS.technology} mục. Thiếu: ${details}.`
}
```

- [x] **Step 5: Update task field type guards/layout**

In both task field components:

- Replace all inline checks for `technical | soft_skill | delivery` with `isTaskSkillCategoryCode`.
- Initialize selected state with four keys.
- Change `lg:grid-cols-3` to `sm:grid-cols-2 xl:grid-cols-4`.

- [x] **Step 6: Verify GREEN**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts
```

Expected:

```text
PASS
```

---

### Task 4: DB Migration And Test Factory Defaults

**Files:**

- Create: `database/migrations/20260718150000_migrate_skill_categories_to_four_groups.ts`
- Modify: `tests/helpers/factories/review_skill.ts`
- Modify: `docs_AI/suar.sql`

**Interfaces:**

- Consumes DB table `skills`.
- Produces DB constraint `skills_category_code_check` allowing `technology`, `engineering`, `soft_skill`, `delivery`.

- [x] **Step 1: Write failing migration validation test**

Add assertion to `app/modules/skills/tests/backend/integration/competency_schema_repair_audit.spec.ts` or create `app/modules/skills/tests/backend/integration/skill_category_schema.spec.ts`:

```ts
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('Skill category schema', () => {
  test('skills category CHECK allows four canonical categories and rejects technical', async ({
    assert,
  }) => {
    const rows = await db.rawQuery(`
      select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'skills'
        and c.conname = 'skills_category_code_check'
    `)

    const definition = rows.rows[0]?.definition ?? ''

    assert.include(definition, 'technology')
    assert.include(definition, 'engineering')
    assert.include(definition, 'soft_skill')
    assert.include(definition, 'delivery')
    assert.notInclude(definition, 'technical')
  })
})
```

- [x] **Step 2: Verify RED**

Run:

```bash
pnpm run db:test:migrate
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/skills/tests/backend/integration/skill_category_schema.spec.ts
```

Expected:

```text
FAIL because DB CHECK still includes technical and does not include technology/engineering
```

- [x] **Step 3: Add migration**

Create migration:

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class MigrateSkillCategoriesToFourGroups extends BaseSchema {
  async up() {
    this.schema.raw(`
      alter table skills drop constraint if exists skills_category_code_check;

      update skills
      set category_code = 'technology'
      where category_code = 'technical';

      update skills
      set category_code = 'engineering'
      where skill_code in ('testing', 'code_review');

      alter table skills add constraint skills_category_code_check
        check (category_code in ('technology', 'engineering', 'soft_skill', 'delivery'));
    `)
  }

  async down() {
    this.schema.raw(`
      alter table skills drop constraint if exists skills_category_code_check;

      update skills
      set category_code = 'technical'
      where category_code = 'technology';

      update skills
      set category_code = 'delivery'
      where skill_code in ('testing', 'code_review');

      alter table skills add constraint skills_category_code_check
        check (category_code in ('technical', 'soft_skill', 'delivery'));
    `)
  }
}
```

- [x] **Step 4: Update factory default**

In `tests/helpers/factories/review_skill.ts`, change default:

```ts
category_code: overrides.category_code ?? 'technology',
```

- [x] **Step 5: Verify GREEN**

Run:

```bash
pnpm run db:test:migrate
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/skills/tests/backend/integration/skill_category_schema.spec.ts
```

Expected:

```text
PASS
```

---

### Task 5: Backend Profile Category Contract

**Files:**

- Modify: `app/modules/users/actions/queries/get_spider_chart_data_query.ts`
- Modify: `app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts`
- Modify: `app/modules/users/tests/backend/integration/user_skills.spec.ts`

**Interfaces:**

- Produces:

```ts
interface SpiderChartResult {
  technology: SpiderChartPoint[]
  engineering: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}
```

- [x] **Step 1: Run impact check**

Run:

```bash
gitnexus impact GetSpiderChartDataQuery
gitnexus impact SpiderChartResult
```

Expected:

```text
risk: MEDIUM or lower
```

- [x] **Step 2: Write failing test expectation**

In `app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts`, replace empty spider data fixtures with:

```ts
spiderChartData: { technology: [], engineering: [], soft_skills: [], delivery: [] },
```

Add assertion where mapper output is checked:

```ts
assert.deepEqual(result.spiderChartData, {
  technology: [],
  engineering: [],
  soft_skills: [],
  delivery: [],
})
```

- [x] **Step 3: Verify RED**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts
```

Expected:

```text
FAIL because spiderChartData lacks technology and engineering fields
```

- [x] **Step 4: Implement profile result**

Update `GetSpiderChartDataQuery` result initialization and category routing:

```ts
interface SpiderChartResult {
  technology: SpiderChartPoint[]
  engineering: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}

const result: SpiderChartResult = {
  technology: [],
  engineering: [],
  soft_skills: [],
  delivery: [],
}

if (skill.category_code === 'technology') {
  result.technology.push(point)
} else if (skill.category_code === 'engineering') {
  result.engineering.push(point)
} else if (skill.category_code === 'soft_skill') {
  result.soft_skills.push(point)
} else if (skill.category_code === 'delivery') {
  result.delivery.push(point)
}
```

Update cache key:

```ts
const cacheKey = `users:spider_chart:v4:${dto.user_id}`
```

- [x] **Step 5: Verify GREEN**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts
```

Expected:

```text
PASS
```

---

### Task 6: Profile Frontend Four Groups

**Files:**

- Modify user/org profile helper/type/theme/show/view/card files listed in File Structure.
- Modify profile component tests.

**Interfaces:**

- Consumes backend `SpiderChartData` with `technology`, `engineering`, `soft_skills`, `delivery`.
- Produces rendered profile groups in order: Technology, Engineering, Soft Skill, Delivery.

- [x] **Step 1: Run impact checks**

Run:

```bash
gitnexus impact PROFILE_SKILL_GROUP_ORDER
gitnexus impact createGroupedSkillsFromSpiderData
gitnexus impact getProfileGroupStyle
```

Expected:

```text
risk: MEDIUM or lower
```

- [x] **Step 2: Write failing frontend tests**

In `inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts`, set spider data:

```ts
spiderChartData: {
  technology: [],
  engineering: [],
  soft_skills: [],
  delivery: [],
},
```

Assert labels:

```ts
expect(screen.getByText(/Công nghệ/i)).toBeInTheDocument()
expect(screen.getByText(/Kỹ thuật phần mềm/i)).toBeInTheDocument()
expect(screen.getByText(/Kỹ năng mềm/i)).toBeInTheDocument()
expect(screen.getByText(/Thực thi/i)).toBeInTheDocument()
```

- [x] **Step 3: Verify RED**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts
```

Expected:

```text
FAIL because profile types/helpers still expect technical
```

- [x] **Step 4: Implement user profile**

Change user profile helper:

```ts
const PROFILE_SKILL_GROUP_ORDER = ['technology', 'engineering', 'soft_skill', 'delivery']

export function createGroupedSkillsFromSpiderData(
  categoryCode: 'technology' | 'engineering' | 'soft_skill' | 'delivery',
  points: SpiderChartPoint[]
): GroupedProfileSkills {
  // existing body
}
```

Change `SpiderChartData`:

```ts
export interface SpiderChartData {
  technology: SpiderChartPoint[]
  engineering: SpiderChartPoint[]
  soft_skills: SpiderChartPoint[]
  delivery: SpiderChartPoint[]
}
```

Change fallback groups in user `show.svelte` and `view.svelte`:

```ts
createGroupedSkillsFromSpiderData('technology', spiderChartData.technology),
createGroupedSkillsFromSpiderData('engineering', spiderChartData.engineering),
createGroupedSkillsFromSpiderData('soft_skill', spiderChartData.soft_skills),
createGroupedSkillsFromSpiderData('delivery', spiderChartData.delivery),
```

Change chart entries:

```ts
const chartEntries: [ChartCardInput['categoryCode'], SpiderChartPoint[]][] = [
  ['technology', spiderChartData.technology],
  ['engineering', spiderChartData.engineering],
  ['soft_skill', spiderChartData.soft_skills],
  ['delivery', spiderChartData.delivery],
]
```

- [x] **Step 5: Mirror org profile**

Apply the same changes to the org profile files.

- [x] **Step 6: Verify GREEN**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts inertia/apps/user/tests/modules/profile/show.test.ts
```

Expected:

```text
PASS
```

---

### Task 7: Marketplace, Talent, Search, And Review Labels

**Files:**

- Modify marketplace filters, talent index, search comboboxes, review spider color helpers.
- Modify matching frontend tests.

**Interfaces:**

- Consumes four category values.
- Produces UI labels:
  - `technology`: Technology or Công nghệ
  - `engineering`: Engineering or Kỹ thuật phần mềm
  - `soft_skill`: Soft Skills or Kỹ năng mềm
  - `delivery`: Delivery or Thực thi

- [x] **Step 1: Write failing tests**

In marketplace/search/talent frontend tests, replace old category fixtures:

```ts
{ id: 'skill-tech', skill_name: 'TypeScript', category_code: 'technology' }
{ id: 'skill-eng', skill_name: 'API Design', category_code: 'engineering' }
{ id: 'skill-soft', skill_name: 'Communication', category_code: 'soft_skill' }
{ id: 'skill-delivery', skill_name: 'Release Planning', category_code: 'delivery' }
```

Assert filters render both `Technology`/`Công nghệ` and `Engineering`/`Kỹ thuật phần mềm`.

- [x] **Step 2: Verify RED**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts inertia/apps/org/tests/modules/talents/index.test.ts
```

Expected:

```text
FAIL because old label maps do not contain technology and engineering
```

- [x] **Step 3: Implement label maps**

Use category option arrays:

```ts
const SKILL_CATEGORY_OPTIONS = [
  { value: 'technology', label: 'Công nghệ' },
  { value: 'engineering', label: 'Kỹ thuật phần mềm' },
  { value: 'soft_skill', label: 'Kỹ năng mềm' },
  { value: 'delivery', label: 'Thực thi' },
] as const
```

In org talent:

```ts
const categoryLabels: Record<string, string> = {
  technology: 'Technology',
  engineering: 'Engineering',
  delivery: 'Delivery',
  soft_skill: 'Soft Skills',
}
```

In review chart colors:

```ts
if (categoryCode === 'technology')
  return { fill: 'rgba(20, 184, 166, 0.18)', stroke: 'rgb(13, 148, 136)' }
if (categoryCode === 'engineering')
  return { fill: 'rgba(124, 58, 237, 0.16)', stroke: 'rgb(109, 40, 217)' }
if (categoryCode === 'delivery')
  return { fill: 'rgba(244, 93, 45, 0.18)', stroke: 'rgb(244, 93, 45)' }
return { fill: 'rgba(37, 99, 235, 0.18)', stroke: 'rgb(37, 99, 235)' }
```

- [x] **Step 4: Verify GREEN**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts inertia/apps/org/tests/modules/talents/index.test.ts
```

Expected:

```text
PASS
```

---

### Task 8: Seed Data Four-Category Coverage

**Files:**

- Modify seed files listed in File Structure.
- Modify `start/routes/testing.ts`.
- Modify seed/test specs that assert skill category counts.

**Interfaces:**

- Produces demo data with all four category groups.
- Produces task required skills that satisfy new one-per-category rule.

- [ ] **Step 1: Write failing seed test**

Create or extend seed integrity test with query:

```ts
const rows = await db
  .from('skills')
  .select('category_code')
  .count('* as total')
  .groupBy('category_code')

const totals = Object.fromEntries(rows.map((row) => [row.category_code, Number(row.total)]))

assert.isAtLeast(totals.technology ?? 0, 1)
assert.isAtLeast(totals.engineering ?? 0, 1)
assert.isAtLeast(totals.soft_skill ?? 0, 1)
assert.isAtLeast(totals.delivery ?? 0, 1)
assert.isUndefined(totals.technical)
```

- [ ] **Step 2: Verify RED**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/skills/tests/backend/integration/project_skill_service.spec.ts
```

Expected:

```text
FAIL until seed expectations and migration are updated
```

- [ ] **Step 3: Update `skill_seeder.ts` skill specs**

Use category list:

```ts
const skillSpecs = [
  ['react', 'React', 'technology'],
  ['nodejs', 'Node.js', 'technology'],
  ['typescript', 'TypeScript', 'technology'],
  ['svelte', 'Svelte', 'technology'],
  ['postgresql', 'PostgreSQL', 'technology'],
  ['devops', 'DevOps', 'technology'],
  ['testing', 'Testing & QA', 'engineering'],
  ['code_review', 'Code Review', 'engineering'],
  ['oop', 'Object-Oriented Programming', 'engineering'],
  ['design_patterns', 'Design Patterns', 'engineering'],
  ['clean_code', 'Clean Code', 'engineering'],
  ['api_design', 'API Design', 'engineering'],
  ['system_design', 'System Design', 'engineering'],
  ['design_system', 'Design System', 'engineering'],
  ['communication', 'Communication', 'soft_skill'],
  ['problem_solving', 'Problem Solving', 'soft_skill'],
  ['leadership', 'Leadership', 'soft_skill'],
  ['planning', 'Planning', 'delivery'],
  ['estimation', 'Estimation', 'delivery'],
  ['release_management', 'Release Management', 'delivery'],
  ['risk_tracking', 'Risk Tracking', 'delivery'],
  ['documentation', 'Documentation', 'delivery'],
] as const
```

- [ ] **Step 4: Update task specs**

For task specs, ensure every `requiredSkills` has at least:

```ts
;['typescript', 'api_design', 'communication', 'planning']
```

or a domain-specific equivalent:

```ts
;['postgresql', 'data_modelling', 'problem_solving', 'risk_tracking'][
  ('svelte', 'design_system', 'communication', 'documentation')
][('testing', 'code_review', 'communication', 'release_management')]
```

- [ ] **Step 5: Update testing route seed helpers**

Replace route seed inputs with four groups:

```ts
;[
  { skill_name: 'TypeScript', category_code: 'technology', importance: 'critical' },
  { skill_name: 'API Design', category_code: 'engineering', importance: 'critical' },
  { skill_name: 'Clear Communication', category_code: 'soft_skill', importance: 'high' },
  { skill_name: 'Release Ownership', category_code: 'delivery', importance: 'high' },
]
```

- [ ] **Step 6: Verify GREEN**

Run:

```bash
pnpm run db:test:migrate
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts app/modules/users/tests/backend/integration/user_skills.spec.ts
```

Expected:

```text
PASS
```

---

### Task 9: Docs, Declarations, And Schema Artifacts

**Files:**

- Modify docs and diagram files listed in File Structure.
- Regenerate declarations if project command exists.
- Update `docs_AI/suar.sql`.

**Interfaces:**

- Produces docs with no canonical `technical` top-level category.
- Produces generated types matching code.

- [ ] **Step 1: Update docs**

Replace docs wording:

```text
technical | soft_skill | delivery
```

with:

```text
technology | engineering | soft_skill | delivery
```

Use example text:

```text
Technology: React, PostgreSQL, Redis, Java, C#, NestJS.
Engineering: OOP, Design Patterns, Clean Code, API Design, System Design, Design System.
Soft Skill: Communication, Leadership, Problem Solving.
Delivery: Planning, Estimation, Release, Risk Tracking, Documentation.
```

- [ ] **Step 2: Regenerate declarations/schema artifacts**

Run project commands available in repo:

```bash
pnpm run typecheck
```

If generated declaration commands are required by repo workflow, run that documented generator and inspect only taxonomy-related diffs.

- [ ] **Step 3: Scan for old canonical category**

Run:

```bash
rg -n "technical.*soft_skill.*delivery|technical \\| soft_skill \\| delivery|category_code.*technical|categoryCode.*technical|SkillCategoryCode\\.TECHNICAL" app inertia docs docs_AI database tests start --glob '!docs_AI/skeleton/**'
```

Expected:

```text
Only historical notes, migration down(), or non-skill uses of the word technical remain.
```

---

### Task 10: Final Verification

**Files:**

- No new edits unless verification exposes failures.

**Interfaces:**

- Confirms full requested end state.

- [ ] **Step 1: Run focused backend suite**

Run:

```bash
node --import=@poppinss/ts-exec bin/test.ts unit --files app/modules/skills/tests/backend/unit/skill_domain_invariants.spec.ts app/modules/tasks/tests/backend/unit/task_required_skill_category_rules.spec.ts app/modules/users/tests/backend/unit/user_controller_mappers.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 2: Run focused integration suite**

Run:

```bash
pnpm run db:test:migrate
node --import=@poppinss/ts-exec bin/test.ts integration --files app/modules/tasks/tests/backend/integration/task_metadata_query.spec.ts app/modules/users/tests/backend/integration/user_skills.spec.ts app/modules/skills/tests/backend/integration/skill_category_schema.spec.ts
```

Expected:

```text
PASS
```

- [ ] **Step 3: Run focused frontend suite**

Run:

```bash
pnpm exec vitest run inertia/apps/user/tests/modules/tasks/components/task_skills_field.test.ts inertia/apps/org/tests/modules/tasks/components/task_skills_field.test.ts inertia/apps/user/tests/modules/profile/components/profile_skills_and_charts_section.test.ts inertia/apps/user/tests/modules/profile/components/profile_spider_chart_card.test.ts inertia/apps/org/tests/modules/talents/index.test.ts inertia/apps/user/tests/modules/search/skill_search_combobox.test.ts inertia/apps/org/tests/modules/search/skill_search_combobox.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
pnpm run typecheck
```

Expected:

```text
PASS
```

- [ ] **Step 5: Verify DB state**

Run:

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs'
import { Client } from 'pg'

const env = {}
for (const raw of fs.readFileSync('.env', 'utf8').split('\n')) {
  const line = raw.trim()
  if (!line || line.startsWith('#')) continue
  const i = line.indexOf('=')
  if (i <= 0) continue
  const key = line.slice(0, i).trim()
  let value = line.slice(i + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
  env[key] = value
}

const client = new Client({
  host: env.PG_HOST,
  port: Number(env.PG_PORT || '5432'),
  user: env.PG_USER,
  password: env.PG_PASSWORD || '',
  database: env.PG_TEST_DATABASE,
})

await client.connect()
const result = await client.query(`
  select category_code, count(*)::int as total
  from skills
  group by category_code
  order by category_code
`)
console.log(result.rows)
await client.end()
NODE
```

Expected:

```text
Rows only for delivery, engineering, soft_skill, technology.
No technical row.
```

- [ ] **Step 6: Run GitNexus change detection**

Run:

```bash
gitnexus detect-changes
```

Expected:

```text
Affected symbols match taxonomy, task requirements, profile, search, seed, docs.
```

---

## Execution Notes

- Worktree creation was not automatic because current checkout has staged unrelated renames and many existing changes. Work in current tree with careful per-file reads before edits.
- Commit only after user approves handling of existing staged changes, or use `git commit --only <our-files>` with explicit file list after `gitnexus detect-changes`.
- For every production edit, first write or update the failing test, run it, then implement minimal code.

## Self-Review

- Spec coverage: taxonomy, DB, backend, frontend, seed, test, docs, search, generated artifacts all map to tasks.
- Placeholder scan: clean for placeholder markers and unspecified implementation steps.
- Type consistency: backend category type is `SkillCategoryCodeValue`; frontend task type is `TaskSkillCategoryCode`; persisted values match `technology | engineering | soft_skill | delivery`.
