# Suar Filter Platform Design

**Status:** Proposed target architecture  
**Date:** 2026-08-01  
**Scope:** Every present and future filterable collection, workflow, dashboard, discovery surface,
API, automation, and search experience in Suar  
**Related:** [Enterprise Search and Discovery](./2026-08-01-enterprise-search-discovery-design.md),
[Taxonomy and Metadata](./2026-08-01-taxonomy-metadata-design.md)

## 1. Objective

Suar needs filtering as a platform capability, not as a collection of page-specific dropdowns and
not as a subordinate feature of full-text search.

The platform must let a user or trusted system express precise, composable criteria over a bounded
resource context. It must work with a text query, without a text query, through a visual interface,
through an advanced expression builder, through an API, or eventually through constrained natural
language. All entry paths compile into the same typed, permission-safe expression.

The platform must support simple use cases without forcing complexity on beginners and advanced use
cases without forcing each product module to invent its own query language, URL format, saved-view
model, permission behavior, or filter UI primitives.

Task boards, marketplaces, talent directories, audit logs, administrative lists, reports, content
catalogs, and future modules are examples and validation contexts. They do not define or limit the
platform scope.

## 2. Decision summary

1. **Filtering is an independent platform capability.** Search may consume it, but search does not
   own filter semantics.
2. **One expression language, many contexts.** The platform owns the grammar; product domains own
   the available vocabulary and business meaning in each context.
3. **No universal filter form.** Interfaces share state, behavior, and accessible primitives while
   each surface controls composition, density, ordering, and interaction policy.
4. **Server results are authoritative.** The client may preview local state but never derives final
   totals or security-sensitive membership by filtering a partial page.
5. **Taxonomy is a dependency, not part of filtering.** Canonical terms, aliases, hierarchies,
   provenance, and metadata completeness are supplied by domain or taxonomy providers.
6. **Providers are replaceable.** A context may execute through PostgreSQL, Elasticsearch, an
   in-memory collection, a federated provider, or another engine without changing the expression
   sent by trusted clients.
7. **Unknown is not false.** Missing and uncertain metadata remain observable and receive explicit
   semantics.
8. **Saved state is versioned.** URLs, presets, saved views, alerts, and automations never persist
   raw SQL, Elasticsearch DSL, or unversioned field names.

## 3. Conceptual model

Filtering participates in a larger query state but remains independently usable:

```text
Query state
├── text query       optional retrieval input
├── filter           optional strict eligibility expression
├── preferences      optional bounded ranking expressions
├── sort             result ordering
├── projection       fields/columns requested
├── view             client presentation state
└── pagination       offset or cursor state
```

These concepts must not be conflated:

- a **filter** changes result eligibility;
- a **preference** changes only a bounded ranking contribution, never eligibility;
- a **facet** exposes filterable values and contextual counts for exploration;
- a **sort** changes order without changing eligibility;
- a **view** changes presentation without changing the result set;
- a **permission constraint** is a mandatory server-owned filter that is never removable by the
  client;
- a **text query** may retrieve and score candidates but is optional for filter-only browsing.

## 4. Vocabulary

### 4.1 Resource

A resource is the logical result type being queried, such as an entity collection, event stream,
projection, or virtual blended result. Resource keys are stable namespaced identifiers rather than
route names.

### 4.2 Context

A context describes why and under which rules a resource is being filtered. The same resource can
have several contexts with different permissions, fields, defaults, execution plans, and UI.

```text
resource: work_item
contexts:
  work_item.personal_focus
  work_item.team_operations
  work_item.reporting
  work_item.discovery
```

A route or page consumes a context; it is not itself the context definition.

### 4.3 Field

A filter field is a stable, allowlisted semantic key defined by the context owner. It describes a
business concept, not a database column or search-index path.

### 4.4 Condition and group

A condition evaluates one field with one operator and value. A group combines conditions or nested
groups with Boolean logic.

### 4.5 Strict effect and preference

Strict conditions use one of two effects:

- `require`: a result must satisfy the condition;
- `exclude`: a result satisfying the condition is removed;

Preferences are separate clauses over a filter expression:

- `prefer`: a match adds a bounded positive ranking contribution;
- `avoid`: a match adds a bounded negative ranking contribution without removing the result.

Keeping preferences outside the eligibility tree prevents an `OR` group from ambiguously mixing
hard inclusion and soft scoring. Preference clauses are valid only in contexts whose executor
supports ranking. Unsupported clauses fail validation instead of silently becoming strict filters.

### 4.6 Facet

A facet is a discoverable filter field with values, labels, counts, selection state, and optional
hierarchy. Not every filter is a facet, and permission constraints are normally hidden filters.

### 4.7 Filter view

A filter view is a named, versioned set of filter, sort, projection, and optional presentation
state. A saved search is a filter view whose context also includes text retrieval criteria.

## 5. Expression language

### 5.1 Canonical AST

The transport contract is typed and recursive. It never accepts executable code or provider DSL.

```ts
type FilterStrictEffect = 'require' | 'exclude'
type FilterPreferenceEffect = 'prefer' | 'avoid'

type FilterUnknownPolicy = 'include' | 'exclude'

type FilterScalar = string | number | boolean

type FilterValue =
  | { kind: 'scalar'; value: FilterScalar }
  | { kind: 'set'; values: FilterScalar[]; minimumMatch?: number }
  | { kind: 'range'; gte?: FilterScalar; gt?: FilterScalar; lte?: FilterScalar; lt?: FilterScalar }
  | {
      kind: 'relative_time'
      amount: number
      unit: 'minute' | 'hour' | 'day' | 'week' | 'month'
      anchor: 'now'
    }
  | { kind: 'hierarchy'; termIds: string[]; expansion: 'exact' | 'descendants' | 'ancestors' }
  | { kind: 'relation'; expression: FilterExpression; count?: { gte?: number; lte?: number } }

interface FilterCondition {
  kind: 'condition'
  field: string
  operator: string
  effect: FilterStrictEffect
  value?: FilterValue
  unknown: FilterUnknownPolicy
}

type FilterExpression =
  | {
      kind: 'group'
      combinator: 'and' | 'or'
      children: FilterExpression[]
      negated?: boolean
    }
  | FilterCondition

interface FilterPreference {
  effect: FilterPreferenceEffect
  expression: FilterExpression
  weight?: number
}

interface FilterFacetRequest {
  field: string
  countMode?: 'constrained' | 'self_excluding'
  valueSearch?: string
  cursor?: string
}
```

`minimumMatch` expresses criteria such as “at least three of these five values.” Exact-set matching
is an operator rather than an ambiguous special case of `all`.

### 5.2 Query criteria contract

```ts
interface QueryCriteriaRequest {
  context: string
  schemaVersion: number
  text?: { value: string }
  filter?: FilterExpression
  preferences?: FilterPreference[]
  sort: Array<{ field: string; direction: 'asc' | 'desc' }>
  projection?: string[]
  requestedFacets?: FilterFacetRequest[]
  page: {
    size: number
    cursor?: string
    offset?: number
  }
}
```

The context determines whether text, preferences, facets, cursor pagination, offsets, empty
requests, or particular sort modes are allowed. A Search-owned wrapper chooses lexical, semantic,
or hybrid retrieval; the provider-neutral Filter contract does not. Security context is resolved
from the authenticated server request and is never accepted from this payload. A request cannot
contain both `cursor` and `offset`.

### 5.3 Operators

The platform defines operator semantics by field type. Contexts opt into a safe subset.

| Field type  | Initial operators                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| scalar      | `eq`, `neq`, `in`, `not_in`, `exists`, `missing`                                                     |
| multi-value | `contains_any`, `contains_all`, `contains_none`, `contains_exactly`, `contains_at_least`, `is_empty` |
| number      | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `outside`                                          |
| date/time   | `before`, `after`, `between`, `within_last`, `within_next`, `overdue`                                |
| text        | `exact`, `contains`, `prefix`; fuzzy or semantic behavior belongs to Search                          |
| hierarchy   | `is`, `is_any`, `within_subtree`, `has_ancestor`                                                     |
| relation    | `related_exists`, `related_missing`, `related_count`, `related_matches`                              |
| boolean     | `is_true`, `is_false`, `is_unknown`                                                                  |

Relational operators are available only through bounded, domain-owned relation definitions. The
platform never permits arbitrary client-selected joins.

### 5.4 Boolean semantics

- A raw field predicate first evaluates to `true`, `false`, or `unknown`.
- `require` preserves `true`/`false`; `exclude` negates them. Both preserve `unknown` until the
  condition's unknown policy maps it to a Boolean.
- `and` requires every child to be `true`; `or` requires at least one child to be `true`.
- `negated` applies Boolean NOT after the children have been combined.
- groups can nest to the context's declared maximum depth;
- empty groups and one-child groups in canonical stored form are invalid;
- duplicate conditions are normalized when equivalence is safe;
- strict expressions determine eligibility before separate preference scoring;
- a preference expression is evaluated with the same rules, but a match changes only its bounded
  score contribution.

After each condition resolves its explicit unknown policy, groups use ordinary Boolean logic:

| A       | B       | `A AND B` | `A OR B` |
| ------- | ------- | --------- | -------- |
| `true`  | `true`  | `true`    | `true`   |
| `true`  | `false` | `false`   | `true`   |
| `false` | `true`  | `false`   | `true`   |
| `false` | `false` | `false`   | `false`  |

| A       | `NOT A` |
| ------- | ------- |
| `true`  | `false` |
| `false` | `true`  |

### 5.5 Three-valued data semantics

Every condition can encounter:

```text
true      the available data proves the condition matches
false     the available data proves the condition does not match
unknown   the value is missing, unavailable, stale, or below the accepted confidence threshold
```

Strict effects apply the `unknown` policy after predicate evaluation:

| Effect    | Predicate `true` | Predicate `false` | Predicate `unknown`, policy `include` | Predicate `unknown`, policy `exclude` |
| --------- | ---------------- | ----------------- | ------------------------------------- | ------------------------------------- |
| `require` | condition true   | condition false   | condition true                        | condition false                       |
| `exclude` | condition false  | condition true    | condition true                        | condition false                       |

An explicit `missing` or `is_unknown` operator selects only unknown values; it is not encoded as an
ambiguous third policy. Context definitions provide a safe default for each field. The UI must not
label unknown as false. A preference contributes a score only when its complete expression resolves
to `true`; a `false` expression contributes no score. Conditions inside preference expressions must
use `unknown: 'exclude'`. A context that intentionally prefers missing data uses the explicit
`missing`/`is_unknown` operator, making that choice visible and explainable.

Unknown reasons may include:

- source field missing;
- field intentionally not collected;
- value hidden by permission;
- taxonomy term retired or unresolved;
- derived value below confidence threshold;
- projection stale or enrichment pending.

Permission-hidden information must not be distinguished from absence in a way that leaks data.

### 5.6 Set semantics and canonical equivalences

For an entity value set `E` and selected canonical set `S`:

| Operator            | Predicate                             |
| ------------------- | ------------------------------------- | ----- | ---------------- |
| `contains_any`      | `                                     | E ∩ S | >= 1`            |
| `contains_all`      | `S ⊆ E`                               |
| `contains_none`     | `                                     | E ∩ S | = 0`             |
| `contains_exactly`  | `E = S` after canonical deduplication |
| `contains_at_least` | `                                     | E ∩ S | >= minimumMatch` |
| `is_empty`          | `E` is known and has zero members     |

An absent set is `unknown`, not an empty known set. `minimumMatch` must be an integer between one and
the number of unique selected values.

Canonicalization uses these equivalences:

- `exclude contains_any(S)` becomes `require contains_none(S)`;
- `exclude contains_none(S)` becomes `require contains_any(S)`;
- `not_in(S)` becomes `exclude in(S)`;
- a negated single strict condition is pushed into its strict effect when the operator has a proven
  complement and the unknown policy remains identical;
- values are deduplicated and ordered by canonical identity for hashing, but UI display order can be
  preserved separately;
- no De Morgan rewrite crosses a relation boundary or changes an explicit unknown policy.

The canonicalizer chooses the `require` form above. Adapters must pass fixtures that prove equivalent
forms return the same result IDs.

### 5.7 Preference scoring

A context definition declares maximum preference clauses, allowed fields, allowed weight range, and
an aggregation strategy. V1 uses deterministic bounded additive scoring:

```text
normalizedWeight = clamp(weight ?? 1, context.minWeight, context.maxWeight)
contribution(prefer, match) = +normalizedWeight
contribution(avoid, match)  = -normalizedWeight
contribution(_, no match)   = 0
preferenceScore             = clamp(sum(contributions), -context.maxPreferenceScore, context.maxPreferenceScore)
```

The executor combines this bounded score with its owned base rank through a context-versioned
formula. Preference score cannot override permission constraints, strict eligibility, exact
identity rules, or an explicit user sort that disables relevance. Every non-zero contribution is
available to the explanation contract.

## 6. Context definition contract

Each domain exposes one or more filter context definitions through a platform port.

```ts
interface FilterContextDefinition {
  key: string
  version: number
  resource: string
  ownerModule: string
  capabilities: {
    text: boolean
    facets: boolean
    nestedGroups: boolean
    preferences: boolean
    relativeTime: boolean
    savedViews: boolean
    sharedViews: boolean
    alerts: boolean
    emptyRequest: boolean
    pagination: 'cursor' | 'offset' | 'bounded' | 'none'
    maxDepth: number
    maxConditions: number
  }
  fields: FilterFieldDefinition[]
  sorts: FilterSortDefinition[]
  defaultFilter?: FilterExpression
  defaultSort: Array<{ field: string; direction: 'asc' | 'desc' }>
  executionProfile: string
  presentationHints?: FilterPresentationHints
}
```

A field definition includes:

- stable semantic key and localized label key;
- field type and cardinality;
- allowed operators and strict effects, plus whether the field can participate in preferences;
- value source: static, taxonomy, relation, remote options, or free input;
- default unknown policy;
- sensitivity classification;
- whether it is facetable, sortable, projectable, and searchable within values;
- hierarchy and descendant behavior when applicable;
- data-coverage and freshness metadata where available;
- cost class and validation limits;
- optional presentation hints, never a mandatory page layout.

Clients receive only definitions authorized for their current principal. A client cannot invent a
field by submitting a key that was absent from the effective definition.

## 7. Ownership and module boundaries

The following matrix is normative when responsibilities overlap:

| Concern                                                | Owner                    | Consumer/adapter responsibility                                         |
| ------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| AST, operator truth tables, canonicalization           | Filter Platform          | Domains select allowed subsets                                          |
| Domain/vertical context definition                     | Owning product domain    | Search or SQL executor binds semantic fields                            |
| Blended cross-domain Search context                    | Search                   | Participating domains expose authorized fields/results through ports    |
| SQL semantic-field binding and execution               | Owning product domain    | Filter Platform validates/orchestrates                                  |
| Elasticsearch binding and execution                    | Search                   | Owning domain approves semantic context fields                          |
| Mandatory permission constraints                       | Owning product domain    | Executor composes them before totals/facets                             |
| Structured qualifiers and visual/URL round-trip        | Filter Platform          | Search separates residual retrieval text from typed criteria            |
| Lexical/semantic query understanding                   | Search                   | Filter Platform receives only extracted typed criteria                  |
| Natural-language-to-AST contract and validation        | Filter Platform          | Search or another surface may host the assistant UX                     |
| Saved-view persistence, version migration, sharing     | Filter Platform          | Context owner authorizes use and supplies migration hooks               |
| Alert scheduling, criteria revalidation, deduplication | Filter Platform          | Context owner supplies trigger/execution and domain notification action |
| Search saved-search/alert UX                           | Search surface           | Uses Filter Platform lifecycle; does not duplicate persistence          |
| Shared filter state and accessible primitives          | Filter Platform frontend | Each surface owns composition, labels, density, and commit policy       |
| Canonical terms, hierarchy, aliases, assignments       | Domain/taxonomy provider | Filter and Search consume provider contracts                            |

A vertical Search experience therefore has one domain-owned context definition and a Search-owned
executor binding. Only a genuinely blended virtual result context is Search-owned end to end.

### 7.1 Filter Platform owns

- canonical AST and validation;
- context-definition contracts and registry orchestration;
- canonicalization, hashing, URL encoding, and diagnostics;
- saved filter-view lifecycle and schema-version metadata;
- shared execution and facet response contracts;
- permission-safe orchestration hooks;
- cross-context telemetry vocabulary;
- reusable frontend state and accessible UI primitives.

### 7.2 Product domains own

- which business fields exist in a context;
- the business meaning of values and operators;
- permission policy and mandatory constraints;
- relation definitions and aggregate semantics;
- source-of-truth option providers;
- SQL or repository adapters for domain-owned execution;
- result hydration and domain actions.

### 7.3 Search owns

- text parsing and retrieval;
- lexical, fuzzy, semantic, and hybrid candidate generation;
- search index mappings and projection lifecycle;
- search-specific ranking, suggestions, spelling recovery, and relevance evaluation;
- Elasticsearch compilation behind a Filter Platform execution port;
- blended or federated Search-owned virtual contexts and indexed executor bindings for
  domain-owned vertical contexts.

Search consumes canonical filter expressions. It does not redefine filter operators or accept raw
Elasticsearch DSL from clients.

### 7.4 Taxonomy and metadata providers own

- canonical term identity;
- aliases, localized labels, and hierarchy paths;
- multi-label entity assignments;
- assignment provenance, confidence, and review status;
- versioning, term retirement, merge, and replacement;
- coverage and completeness signals.

### 7.5 Proposed package shape

```text
app/modules/filtering/
├── domain/
│   ├── filter_expression.ts
│   ├── filter_context_definition.ts
│   ├── filter_validation.ts
│   └── saved_filter_view.ts
├── public_contracts/
│   ├── filter_query.ts
│   ├── filter_facets.ts
│   ├── filter_diagnostics.ts
│   └── filter_context_provider.ts
├── actions/
│   ├── commands/save_filter_view_command.ts
│   ├── queries/resolve_filter_context_query.ts
│   └── ports/
└── infra/
    └── saved-view persistence and provider-neutral adapters only

inertia/apps/shared/filtering/
├── state and URL codec
├── expression builder
├── filter bar/drawer/workbench
├── facet primitives
├── active chips and summary
└── saved-view controls
```

Domain context definitions stay inside their owning modules and are wired at composition roots. The
Filter Platform must not import every product module to discover definitions.

## 8. Execution model

### 8.1 Request lifecycle

```text
UI, API, automation, or assistant
             │
             ▼
     QueryCriteriaRequest
             │
             ▼
Resolve authorized context definition
             │
             ▼
Validate, canonicalize, and enforce limits
             │
             ▼
Compose server-owned permission constraints
             │
             ▼
Select context execution profile
        ┌────┼───────────┐
        ▼    ▼           ▼
      SQL  Search    Federated/domain adapter
        └────┼───────────┘
             ▼
Results, facets, totals, diagnostics, explanation
```

### 8.2 Execution profiles

An execution profile maps semantic fields and operators to a trusted adapter. It declares:

- supported field and operator combinations;
- estimated cost classes;
- maximum page size, depth, conditions, and facet requests;
- stable sorting and tie-break rules;
- timeout and degradation policy;
- total-count accuracy behavior;
- provider capability flags;
- cache canonicalization requirements.

Unsupported expressions fail with structured diagnostics. They are never silently dropped unless
the context explicitly allows a best-effort mode and the response reports every ignored condition.

The following ports are normative boundaries; provider-specific query objects remain private to the
adapter:

```ts
interface FilterContextProvider {
  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition>
}

interface FilterPermissionConstraintProvider {
  buildMandatoryExpression(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterExpression | undefined>
}

interface FilterQueryExecutor {
  profile: string
  describeCapabilities(): FilterExecutorCapabilities
  execute<T>(input: {
    definition: FilterContextDefinition
    criteria: QueryCriteriaRequest
    mandatoryFilter?: FilterExpression
    requestId: string
  }): Promise<QueryCriteriaResponse<T>>
}

interface FilterSchemaMigrationProvider {
  migrate(input: {
    context: string
    fromVersion: number
    toVersion: number
    criteria: QueryCriteriaRequest
  }): Promise<FilterMigrationResult>
}

// Adapter-internal normative shape; provider clause types never cross the port.
interface FilterSemanticFieldBinding<ProviderClause, ProviderSort, ProviderFacet> {
  field: string
  fieldType: string
  supportedOperators: string[]
  compileCondition(condition: FilterCondition, scope: FilterCompileScope): ProviderClause
  compileSort(sort: { field: string; direction: 'asc' | 'desc' }): ProviderSort
  compileFacet(request: FilterFacetRequest, reducedFilter: FilterExpression): ProviderFacet
}
```

The orchestration layer resolves the effective definition, validates user criteria, builds the
mandatory expression, and sends both to exactly one registered execution profile. The executor
compiles semantic fields through an internal allowlisted binding map. It must not accept a field or
operator that was absent from both the authorized definition and its server-only permission binding.

Mandatory constraints compose as `AND(mandatoryFilter, userFilter)`. They are not returned as
editable canonical criteria, cannot be negated by user input, and apply before retrieval, scoring,
totals, facets, and suggestions. The response may describe their effect only at a level approved by
the owning permission policy.

Each executor owns an explicit binding map keyed by semantic field. Compilation walks the validated
AST recursively, preserves relation scope, compiles strict predicates, compiles preferences into a
separate bounded scoring channel, applies stable sort tie-breakers, and encodes/decodes provider
cursors behind the port. Facet compilation receives the already reduced eligibility expression
defined in §9. This sequence is covered by adapter-conformance fixtures rather than inferred from
provider behavior.

### 8.3 Provider rules

- PostgreSQL adapters use parameterized, allowlisted mappings; no field name is interpolated from
  untrusted input.
- Elasticsearch adapters compile semantic keys to owned mappings and use filter context for strict
  clauses and bounded scoring clauses for preferences.
- In-memory execution is permitted only for complete, explicitly bounded collections and must use
  the same truth semantics.
- Federated contexts own their normalization and total semantics; the platform does not pretend
  incomparable provider counts are exact.
- Client-side filtering of a partial server page is never authoritative.

Every executor capability description declares Boolean depth, relation support, preference scoring,
facet count modes, total accuracy, pagination modes, and whether text retrieval is supported. The
context capability set must be a subset of its executor capability set; composition-root validation
fails at startup when they disagree.

### 8.4 Result contract

```ts
interface QueryCriteriaResponse<T> {
  context: string
  schemaVersion: number
  canonicalCriteria: QueryCriteriaRequest
  hits: T[]
  total: { value: number; relation: 'eq' | 'gte' | 'unknown' }
  facets: FilterFacetGroup[]
  diagnostics: FilterDiagnostic[]
  explanation?: FilterExecutionExplanation
  page: { nextCursor?: string; previousCursor?: string }
  execution: {
    provider: string
    degraded: boolean
    partial: boolean
    requestId: string
  }
}
```

Diagnostics distinguish invalid field, invalid value, retired taxonomy term, unsupported operator,
permission removal, migrated field, stale definition, cost limit, and provider degradation.

## 9. Facets and exploration

Facet behavior is part of the platform contract:

- counts are calculated after mandatory permission constraints;
- counts are contextual to the text query and other selected conditions;
- a context can request self-excluding/disjunctive counts for the active facet;
- every count declares whether it is exact, bounded, or approximate;
- selected values remain visible when their contextual count becomes zero;
- high-cardinality facets use search-within-facet and pagination;
- hierarchical facets can include descendants and multiple parent paths;
- missing and unknown counts are returned only when privacy policy permits;
- dependent facets can restrict their option space based on canonical upstream selections;
- facet ordering may use deterministic business priority, count, alphabetical order, or a declared
  context strategy;
- facet values use canonical IDs, never translated labels, as persisted identity.

`constrained` counts evaluate the complete effective eligibility expression. `self_excluding`
counts are valid only when the selected field is represented by an extractable facet clause:

- the root eligibility expression is an `and` group or one condition;
- the removable child is one condition for the facet field, or a non-negated `or` group containing
  only conditions for that same field;
- the field does not also occur inside another root child, a negated/mixed group, or a nested
  relation scope.

Self-exclusion removes that complete root child and treats a root with no user children as `true`.
Server-owned permission constraints remain applied. Preferences do not change eligibility counts.

Arbitrary variable removal from nested or negated Boolean expressions is intentionally undefined:
for example, removing `color` from `NOT(color = red AND size = large)` could produce several
different user meanings. When a field is not extractable, the executor returns an
`unsupported_self_excluding_expression` diagnostic for that facet. It may also return explicitly
labeled `constrained` counts, but it never presents them as self-excluding counts silently.

The response may include a coverage notice when a facet is based on incomplete metadata. A count of
zero means no permission-visible known matches, not proof that hidden or unknown data does not exist.

## 10. Taxonomy and metadata correctness

Filtering cannot recover labels that were never represented. Every multi-label concept must retain
all legitimate assignments rather than selecting one primary category merely for storage
convenience.

The integration contract requires:

- stable canonical IDs and namespace;
- one or more localized labels;
- reviewed aliases and synonyms;
- optional directed hierarchy paths;
- assignment provenance: explicit, imported, derived, or suggested;
- confidence and review state for derived/suggested assignments;
- taxonomy and enrichment version;
- observable missing, unresolved, stale, and retired states.

Canonical terms and free-form tags are separate concepts even when a UI presents them together.
Machine-suggested metadata is not silently promoted to reviewed truth. Contexts decide whether it is
excluded, included as unknown, or accepted above a declared confidence threshold.

## 11. Permission, privacy, and fairness

1. Permission constraints are resolved server-side and applied before totals and facets.
2. A filter definition cannot expose a field the principal is not authorized to know exists.
3. Facet counts, missing counts, suggestions, validation errors, and timing must not reveal hidden
   entities or sensitive attributes.
4. Saved views re-evaluate current permissions on every execution; saving a view never snapshots
   access.
5. Shared views are authorized separately for read, edit, share, and alert subscription.
6. Protected characteristics are not filter or preference signals in employment or evaluation
   contexts.
7. Proxy features require fairness review before being exposed in sensitive contexts.
8. Raw text queries and free-form values follow the Search privacy and retention policy where
   Search is involved.
9. Alerts store canonical criteria and recipient scope, not a privileged result snapshot.

## 12. Saved views, presets, and alerts

### 12.1 Persistence model

A saved view records:

- ID, name, description, owner, and visibility;
- context key and schema version;
- canonical filter expression;
- optional text query, sort, projection, and presentation state;
- default/pinned state;
- alert configuration when supported;
- created/updated timestamps and last successful migration version.

Presentation state is isolated from result semantics so a grid/list change does not alter criteria.
The stored payload never contains raw provider DSL.

### 12.2 Schema evolution

Every context definition has an integer version. A version change requires one of:

- compatibility with the prior canonical form;
- a deterministic migration function;
- a diagnostic that identifies the obsolete condition and asks the user to repair it.

Renames, term merges, retirements, operator changes, and changed default unknown policy are explicit
migration events. Invalid conditions must not disappear silently from saved views.

### 12.3 Cross-version migration choreography

Four versions move independently and must be recorded separately:

- **context schema version:** semantic fields, operators, defaults, and capabilities;
- **taxonomy namespace version:** term identity, aliases, hierarchy, lifecycle, and replacements;
- **projection version:** provider mapping plus the source, taxonomy, and enrichment versions used
  to build it;
- **saved-view version:** context schema version last migrated and taxonomy refs last validated.

A rollout follows this order:

1. Publish backward-readable taxonomy changes and deterministic merge/retirement mappings. A split
   is marked review-required rather than guessed.
2. Build or migrate the provider projection under a new version. Validate completeness, permission,
   semantic-conformance, and representative latency fixtures without routing production requests to
   it.
3. Register executor bindings that can read both the current and candidate context schema during the
   compatibility window.
4. Publish the new context schema only after the candidate executor and taxonomy providers report
   compatible versions.
5. Migrate saved views eagerly in bounded batches or lazily on read through the same ordered,
   idempotent migration chain. Persist migrated criteria atomically with `fromVersion`, `toVersion`,
   migration ID, checksum, and outcome.
6. Activate the new projection/executor routing atomically where the provider supports aliases or a
   server-held generation pointer.
7. Revalidate alerts against current permissions and the activated versions before resuming them.
8. Retire compatibility bindings only after saved-view repair and projection-lag gates pass.

Migration outcomes are:

- `compatible`: no payload rewrite required;
- `migrated`: rewritten deterministically and persisted;
- `requires_repair`: user or operator choice is required;
- `blocked`: provider, permission, or version dependency is unavailable.

Retries with the same migration ID and input checksum are idempotent. A failed batch resumes from a
durable checkpoint and never advances the saved view's version without the migrated payload.

Rollback switches context routing and provider projection back as one operation. It does not erase
published taxonomy history or downgrade already migrated saved views destructively. Forward
compatibility readers or an explicit reverse migration must make newer saved criteria readable;
otherwise affected views are paused with diagnostics. Alerts remain paused while any required
version is blocked, stale, or ambiguous.

### 12.4 Alerts

Alerts execute only for contexts that declare deterministic, permission-safe alert support. They
need:

- schedule or event trigger;
- deduplication and last-seen watermark;
- current permission and context validation;
- bounded result set and delivery rate;
- explanation of which criteria matched;
- pause state when the saved definition requires migration.

## 13. User experience contract

### 13.1 Progressive power

The same AST can be authored through several experiences:

- quick chips for common conditions;
- a compact filter bar;
- a facet rail or mobile drawer;
- a structured advanced expression builder;
- URL and API parameters;
- deterministic qualifier syntax;
- constrained natural-language assistance after the typed contract is stable.

Contexts choose an interaction policy such as instant commit, debounced commit, or staged apply.
One surface must not mix policies unpredictably.

### 13.2 Shared frontend primitives

Shared components provide behavior, not a universal layout:

- `FilterWorkbench`;
- `FilterBar` and `FilterDrawer`;
- `FacetGroup` and `FacetValueCombobox`;
- `ActiveFilterChips` and `FilterSummary`;
- `FilterExpressionBuilder`;
- `SavedViewMenu`;
- date, range, hierarchy, relation, and missing-value controls.

Domain surfaces decide which primitives appear, their order, defaults, density, and labels.

### 13.3 State and navigation

- canonical semantic state is encoded in a shareable URL when the surface has navigation;
- Back/Forward, refresh, and opening in a new tab restore equivalent criteria;
- staged mobile changes do not mutate the committed URL until Apply;
- invalid or migrated URL criteria produce repair diagnostics;
- clearing filters preserves unrelated sort/view state unless the action explicitly says otherwise;
- active criteria remain inspectable even when represented by an advanced expression.

### 13.4 Accessibility

- controls use visible labels and semantic input roles;
- dynamic counts and result changes use appropriate live regions without excessive announcements;
- combobox/listbox behavior follows WAI-ARIA keyboard patterns;
- advanced groups have readable nesting, keyboard reordering, and non-color-only state;
- focus is preserved across asynchronous option and result updates;
- mobile drawers trap and restore focus correctly.

## 14. Explainability and recovery

The platform response can explain:

- which strict conditions a result satisfied;
- which preference and avoidance conditions affected ranking;
- which conditions evaluated as unknown;
- which aliases or taxonomy expansions were applied;
- which mandatory permission constraints affected the available population, without revealing
  their hidden values;
- which condition created a zero-result intersection;
- what reversible relaxation would recover results.

Recovery suggestions are typed patches against the current AST, not replacement free text. A user
can preview and undo them.

## 15. Limits and abuse resistance

Each context declares and enforces:

- maximum expression depth and condition count;
- maximum set size and `minimumMatch` bound;
- maximum facets and facet values per request;
- page-size and deep-pagination limits;
- regular-expression prohibition unless a separately reviewed operator exists;
- range and relative-time bounds;
- provider timeout and query-cost budget;
- rate limits for facet-value search, saved-view execution, and alerts;
- canonical payload size and URL size limits.

Costly but valid filters may require an asynchronous export/report context rather than an
interactive query context.

## 16. Observability and quality

### 16.1 Privacy-safe events

- context opened;
- filter added, changed, or removed;
- expression group created or simplified;
- facet searched or expanded;
- saved view created, shared, migrated, or failed;
- zero-result intersection and accepted/rejected relaxation;
- execution completed, degraded, timed out, or rejected by cost limits.

Events use field keys and bounded value classifications. Sensitive raw values are minimized or
hashed according to context policy.

### 16.2 Quality metrics

- zero-result rate by context and field combination;
- result and facet p50/p95/p99 latency;
- exact versus approximate-count rate;
- invalid/stale saved-view rate;
- metadata coverage by filterable field;
- unknown and unresolved taxonomy rate;
- filter adoption, abandonment, and clear-all rate;
- relaxation acceptance rate;
- query cost and timeout rate;
- permission/facet leakage test coverage.

Telemetry must expose taxonomy and metadata defects. It must not be used to hide them through
ranking tricks.

## 17. Testing strategy

### 17.1 Contract tests

- recursive AST validation and canonicalization;
- operator/type compatibility;
- Any/All/None/Exactly/At-least-N semantics;
- nested Boolean and negation truth tables;
- unknown/missing policy truth tables;
- URL and saved-view round trips;
- schema migration and obsolete-condition diagnostics;
- stable canonical hashing independent of harmless input order.

### 17.2 Adapter conformance tests

Every executor runs the same provider-neutral fixtures where capabilities overlap. SQL and Search
must return equivalent IDs and truth outcomes for the same bounded dataset.

### 17.3 Permission tests

- unauthorized fields absent from effective definitions;
- mandatory constraints cannot be removed or negated;
- totals/facets do not leak hidden entities;
- saved/shared views re-authorize on each execution;
- missing/unknown reasons do not reveal hidden data.

### 17.4 UX tests

- basic and advanced editors produce equivalent ASTs;
- selected values persist at zero count;
- Back/Forward and refresh preserve state;
- staged and instant commit policies behave consistently;
- keyboard and screen-reader interactions;
- zero-result repair is reversible;
- mobile drawer focus and apply/cancel semantics.

### 17.5 Data-quality tests

- multi-label entities remain discoverable through every legitimate assignment;
- hierarchy expansion preserves multi-parent paths;
- retired and merged terms migrate deterministically;
- explicit, derived, and suggested assignments remain distinguishable;
- projection loss of secondary labels fails completeness gates.

## 18. Delivery strategy

The implementation plan should prove generality with deliberately different contexts rather than
building the platform around one page.

### Phase 0 — Inventory and contract implementation mapping

1. Inventory every existing list, filter, search, report, and hidden permission filter.
2. Classify resource, context, owner, provider, cardinality, sensitivity, and current authority.
3. Map the locked AST V1, truth tables, context definitions, executor ports, and diagnostics to
   concrete packages and compatibility boundaries.
4. Map existing taxonomy providers and SQL/Search executors to the normative ports.
5. Translate the URL and cross-version choreography into migration, rollout, and rollback tasks.

### Phase 1 — Kernel and two contrasting pilots

1. Implement the pure AST, validation, canonicalization, and URL codec.
2. Implement context registry wiring without reverse imports into product modules.
3. Select one bounded operational SQL context and one indexed discovery context.
4. Prove filter-only execution, permission composition, multi-value semantics, and adapter
   conformance.
5. Add shared active chips, summary, and basic field controls.

The plan chooses the concrete pilots based on value, correctness risk, metadata readiness, and test
coverage. The architecture is not renamed or reshaped around those pilots.

### Phase 2 — Facets and saved workflows

1. Add authoritative contextual facets and high-cardinality facet search.
2. Add saved/private/shared views and schema migrations.
3. Add hierarchy, relative dates, unknown-data controls, and coverage notices.
4. Migrate repeated filter UI/state into shared primitives.
5. Add alert support only for contexts with deterministic execution.

### Phase 3 — Advanced expressions and relations

1. Add nested Boolean expression builder and reversible simplification.
2. Add bounded relation and aggregate operators through domain adapters.
3. Add preference/avoid scoring for ranking-capable contexts.
4. Add explainability, zero-result diagnosis, and typed relaxation.

### Phase 4 — Assisted authoring and optimization

1. Add deterministic qualifier round-trip.
2. Add constrained natural-language-to-AST assistance with editable preview.
3. Add cost-based planning, precomputed facets, and asynchronous heavy-query contexts where
   measured need justifies them.
4. Use telemetry to improve schema, taxonomy coverage, and UI defaults under explicit governance.

## 19. Acceptance criteria for planning

The design is ready to become an implementation plan when the plan can trace every task back to
these invariants:

- filtering works with or without text retrieval;
- any module can supply a context without the Filter Platform importing that module;
- context fields and operators are server-authorized and allowlisted;
- one AST supports basic UI, advanced UI, URL, API, saved views, and later assistance;
- nested Boolean, set, range, hierarchy, relation, preference, and missing-data semantics are
  explicit even when delivered in later phases;
- permissions apply before results, totals, facets, and suggestions;
- SQL and Search adapters share semantic conformance fixtures;
- metadata completeness and unknown states are observable;
- no page-specific example limits platform scope;
- no client sends raw SQL or Elasticsearch DSL;
- saved criteria survive deterministic schema/taxonomy evolution or stop with an explicit repair
  state;
- context schema, taxonomy, provider projection, and saved-view activation follow the idempotent
  checkpoint and rollback choreography in §12.3;
- the ownership matrix prevents Search or a surface from duplicating Filter Platform lifecycle;
- UI reuse does not force one layout or interaction policy on every context.

## 20. Explicit non-goals

- Do not replace domain repositories with one universal query repository.
- Do not centralize every domain field or permission rule in the Filter Platform.
- Do not require Elasticsearch for filtering.
- Do not treat every filter as a visible facet.
- Do not expose arbitrary joins, scripts, regular expressions, or provider DSL.
- Do not infer missing metadata and present it as reviewed truth.
- Do not build one giant component that renders every surface identically.
- Do not implement all advanced operators in the first delivery phase.
- Do not make filter behavior depend on translated labels or route names.
- Do not calculate authoritative membership or counts from a partial browser page.

## Implementation closure notes — 2026-08-09

Two boundary invariants are now exercised by focused TDD evidence:

- facet value normalization is semantic-binding aware; numeric Elasticsearch date keys are
  converted to canonical ISO strings while the opaque composite cursor retains its provider key;
- cursor pagination preserves `per_page` through URL generation so the cursor's page-size identity
  cannot be replayed with a different request shape.

These are implementation-level guarantees. They do not replace the matrix's required provider
parity, browser, accessibility, resilience, visual, audit and release-manifest evidence.

The saved-view capability has a bounded end-to-end implementation slice as well:

- the Search Center receives an explicit current-organization share target and uses the shared
  saved-view menu contract;
- private-view organization sharing checks approved membership rather than the private view's
  nullable organization owner field;
- revoked membership and stale grants fail closed, and read-only consumers cannot mutate the
  shared view; duplicate remains an explicit copy operation;
- focused backend/UI contracts and the isolated RP-FST-06 Chromium journey pass, including
  conflict/reapply and post-revoke visibility checks.

RP-FST-06 remains `[~]` rather than release-complete until the matrix's visual, audit/hash/ACL,
cross-browser, manifest and independent-review gates are satisfied.

RP-FST-07 now has a bounded owner-continuation slice in addition to stale taxonomy governance
(`1/1` Chromium). The user Search Center task context uses `tasks.discovery.member`, with
`contextOwner: tasks` and alerts enabled for an authenticated organization member. The
test-only `seed-taxonomy-repair-roleplay` endpoint is token-bound and supplies only the external
split prerequisite; the browser still performs save, subscribe, repair, revalidate and resume.
The isolated owner case passes `1/1`. This does not close governed split application, visual/
audit/reviewer joins, cross-browser execution or the repository release gates.

The Filter consumer coordination boundary now derives candidate saved views from a persisted
taxonomy-reference projection and records a child receipt keyed by `(saved_view_id, planToken,
input_checksum)`. Deterministic rename updates and split repair outcomes are covered by focused
coordinator/reference unit evidence `6/6` and PostgreSQL coordination integration `2/2`, including
the transaction rollback/retry worker-crash regression.
A dedicated `filter_taxonomy_migration_runs` child ledger persists cursor, completed IDs, durable
`scan_pass` state and CAS state. The taxonomy governance apply path checks the parent fence before
calling the Filter child, ignores client-supplied consumer items, and publishes only after the
child is `completed`; pending or repair states leave the parent unpublished. Governance unit
evidence is `9/9`, while the saved-view schema and governance API slices pass `8/8` and `5/5`.
The coordinator's durable final-rescan and repair-resume unit passes `6/6`, and the focused
implementation/migration lint is clean. Child run snapshots are now loaded inside the same
transaction as candidate processing, with parent→child row locks before mutation and CAS
checkpointing; the PostgreSQL integration runs two initial coordinator calls concurrently and
still records one serialized child progression. The integration also proves rollback/retry after
a simulated worker exception. The saved-view repository also acquires a
transaction-scoped `FOR UPDATE` row lock for coordination; its focused repository unit passes
`2/2`, and the external-mutation lock integration passes `1/1`. Full governed split publication
for unsupported consumers and process-boundary crash recovery around external mutation remain
open, as do release evidence joins.

The current RP-FST-09 Search recovery slice is also bounded: the real
`search_degraded_recovery_roleplay.spec.ts` suite passes Chromium `3/3` for healthy exact
totals/facets, opaque cursor tamper rejection, fresh-request recovery, and alias-integrity
fail-closed/recovery. The fault is exercised through a token-bound test-only control that
adds/removes a real second Elasticsearch alias backing generation; this is not network-outage,
timeout or shard-failure evidence. Browser response interception and an in-process fake provider
are not used. The bounded test-clock PIT expiry/recovery case now passes; real network/shard PIT
fault and browser-level late-response race remain open. The Search page now surfaces a safe
compatibility-mode/source-unavailable diagnostic on the task-scoped fallback path; the focused
controller test passes `3/3`, the Search Center UI test passes `14/14`, and the task-scoped
degraded browser assertion passes within the Chromium suite. The alias fixture controller's
bounded unit safety coverage passes `3/3` for process-local serialization, orphan cleanup and
ambiguous update retention; all three RP-FST-09 role-play cases now retain their seed timestamps
and call owner-scoped seed cleanup from `finally`, releasing matching alias/clock fixtures before
row cleanup. Testing-route safety passes `8/8`, with Chromium still `3/3`. Search Center navigation
cancellation now has focused Vitest evidence `16/16`, including a real Inertia/http late-response
contract where an older response is delivered after a newer response without replacing the newer
page; targeted ESLint remains `0`. This is transport-level evidence, not a browser E2E race proof.
Multi-worker/process-crash ownership and audit/visual/release joins remain open.

The Talent Discovery boundary also now round-trips the additive taxonomy metadata already present
in the strict search projection: approved alias text, taxonomy versions, assignment provenance and
review states, plus nested skill evidence. Focused Search binding/context unit evidence passes
`7/7`, Talent Discovery plus production Talent engine integration passes `13/13`, and targeted
ESLint passes `0`. This is bounded contract evidence; HTTP/browser presentation, privacy/fairness,
rebuild/cutover, cross-browser and release joins remain open.

The empty-query contract is bounded at the Filter/Search semantic boundary: focused unit and
controller evidence passes `31/31` for context-owned browse, default-filter and reject behavior,
while Search delegates the policy instead of defining a blank-query default. Multi-label set
semantics also have a differential contract across the reference evaluator, real PostgreSQL and
real Elasticsearch: Any, All, None, Exactly and At-least-N agree on the eligible IDs (`1/1`), with
domain/compiler coverage at `21/21`. Cross-layer SQL/ES/API/UI/role-play/visual/security coverage,
unknown/hidden values, invalid-N and nested expressions remain open.

Multi-value state handling is bounded by contract evidence `3/3` and Elasticsearch compiler unit
evidence `13/13`: missing, known-empty, unknown and hidden states retain explicit policy, while
boolean and zero values are not string-coerced. Full PostgreSQL/Elasticsearch parity, facet/total/
timing leakage, API/UI, role-play, visual and security coverage remains open.

The secondary-label boundary is bounded by a real Elasticsearch/SearchDiscovery integration (`1/1`)
for skill, tag and classification labels, preserving hit projection, selected facet counts and
saved semantic criteria. Self-excluding facets have real Elasticsearch integration `2/2` and
compiler unit evidence `5/5`; supported subtrees retain authorization scope and mixed
non-extractable expressions fail with a capability diagnostic. PostgreSQL/API/UI/role-play/visual,
security and broader population coverage remain open.

The selected-zero facet boundary is bounded by real Elasticsearch/SearchDiscovery evidence `1/1`:
the selected value remains visible with exact zero count, authoritative facet metadata and the
canonical filter intact. Admin audit SQL has a dedicated off-page integration `1/1`, with executor
evidence `5/5` and URL/detail frontend evidence `8/8` preserving event identity and request/trace
metadata before pagination. HTTP/API, server-driven staged UI, role-play, visual and accessibility
layers remain open.

High-cardinality facet paging is bounded by real Elasticsearch integration `1/1` and facet compiler
unit `5/5`, with selected values retained and no duplicate facet entries across pages. Marketplace
and Talent domain separation has focused Vitest evidence `4/4` for shared primitives with distinct
composition and wording. Ambiguous/adversarial authoring has unit `2/2` plus contract `1/1` for an
editable uncertain preview, mandatory manual fallback and `autoExecute: false`. SQL parity, runtime
AX, browser/RP, visual/manual review, security and performance evidence remain open.

Relevance experiment safety is bounded by contract `3/3` and SearchDiscovery integration `1/1`:
preview/shadow behavior carries an explicit ranking version and fails safe on malformed candidates
or any eligibility/facet/authorization change. Personalization policy has unit `7/7` and contract
`2/2` evidence for global fallback, consent/reset/opt-out, organization isolation and bounded
explanations without organization-ID leakage. Production runners, real provider/API/UI/browser,
security/resilience/performance, visual and release-manifest evidence remain open.

The release-matrix validator now treats execution result as a real closure gate: only
`passed|failed|skipped` are valid runtime values, and a required case cannot close through a
`failed` or `skipped` artifact. Deferred cases remain explicitly deferrable. The focused validator
wrapper/fixture batch passes `43/43` (`23/23` wrapper plus `20/20` fixture) with targeted ESLint
`0`; every test, role-play and screenshot artifact must now join the manifest `releaseId`, and every
artifact kind must map the case's required layers exactly. This prevents false closure but does not
fabricate the still-missing authoritative release manifest, artifact joins, reviewer approval or
screenshot/hash evidence.

The cursor/PIT lifetime invariant is now enforced by the shared Filter/Search executor: when callers
do not provide an explicit PIT lease, it derives `keep_alive` from the signed cursor codec TTL and
rounds up to whole seconds, so a cursor cannot outlive its default PIT. The TDD regression unit
passes `4/4`, the cursor codec unit passes `2/2`, and the scoped ESLint batch exits `0`. The isolated
real Talent role-play rerun passes Chromium `5/5`, including the previously observed cursor-page
failure path. This remains bounded evidence; real network/shard PIT faults, cross-browser/AX/visual
layers, manifest joins and reviewer approval remain open.

Admin Audit also has a bounded role-play through the real surface: isolated Chromium RP-FST-04
passes `1/1` for staged server filters, Apply, an off-page SQL-authoritative event, detail request/
trace preservation and a matching API response. This remains partial evidence; canonical visual/
hash/ACL joins, cross-browser/AX and release-manifest/reviewer closure are still open.

The Search cursor recovery contract is now fail-closed at the HTTP/Inertia boundary. Invalid,
expired, and stale cursors return no compatibility results and expose only the typed
`discoveryFailure`; they never invoke legacy global search. Search Center renders a visible
cursor-unavailable state and retries only after removing the cursor from the URL. Focused evidence
passes for the controller (`3/3`), Search Center (`18/18`), and the shell-aware URL batch (`20/20`)
with scoped ESLint and Prettier clean. Browser expiry, visual/accessibility, resilience, and
release joins remain open.

The shared Filter Platform lifecycle remains a library boundary rather than a claimed production
integration: URL/history, refresh/new-tab, cursor reset, and staged Back/Forward tests pass
`26/26`, but no current consumer instantiates `FilterStateController`. Browser/Inertia wiring and
legacy flat-URL migration therefore remain explicit downstream work; no unowned migration adapter
is introduced by this slice.

The bounded continuation verifies the existing Marketplace consumer without promoting the shared
controller to a production owner. Its focused Vitest suite passes `6/6`: legacy flat-query input is
preserved, Apply explicitly pushes history, and incoming server props rehydrate draft state without
an extra navigation. Search degraded recovery now passes controller `4/4` and Search Center `20/20`:
cursor plus source-unavailable/timeout/stale-index failures fail closed, legacy fallback is not
invoked, and the visible retry preserves query/filter while removing the cursor. The expression
builder now rehydrates on canonical prop-signature changes, with the focused expression/model/
qualifier suite passing `8/8`.

The real RP-FST-09 Chromium suite passes `5/5`, adding Search Center expiry recovery and cursor-plus-
unavailable-source recovery to the existing healthy, alias-integrity, and API PIT cases. The UI cases
keep task scope aligned with the cursor, assert visible fail-closed/compatibility states, then verify
fresh retry removes `cursor`. Browser race timing, network/shard fault injection, cross-browser/AX/
visual review, and release artifact/reviewer joins remain open.

The latest bounded Search Center continuation adds real Chromium evidence for TC-FST-002 and
TC-FST-024. The q-only journey passes `1/1` with canonical `q`-only history and authoritative
Discovery results. The task cursor journey passes `1/1` against a single organization-scoped fixture
of 25 tasks: the real Next action preserves `type=task` plus the opaque cursor, changes the page from
24 results to the final result, and stops paginating at the boundary. The testing fixture now accepts
only a bounded `searchTaskCount` range of 1–32 and reindexes all generated tasks. This does not
promote the master matrix beyond `0 [x] / 31 [~] / 0 [ ]`; cross-browser, visual/AX, resilience,
release-manifest and reviewer evidence remain open, and TC-FST-028 still lacks a production typed
relaxation proposal/apply/undo contract.

The following bounded wave extends the same boundary without changing the master status. TC-FST-005
has a real Chromium Search Center role-play `1/1` for secondary skill, tag and classification lexical
recall. TC-FST-008 has a UI component test `1/1` preserving an exact zero-count selected facet and
its selected state while another value is added. AST-002 has focused orchestration evidence `15/15`
for rejecting over-depth expressions before provider cost estimation/execution. TC-FST-009 remains
blocked because no frontend facet paging contract exposes `nextCursor` or load-more behavior; facet
provider parity, saved semantic criteria, visual/AX, cross-browser and release joins remain open.

The existing TC-FST-012 recruiter role-play also passes Chromium `1/1` through `/org/talents`:
the real UI submits both seeded skill IDs and `min_proficiency=l7`, returns the matching talent with
public verified accomplishment evidence, and omits private source markers and task/reviewer facts.
This remains bounded evidence. TC-FST-025/026 still lack truthful live replay, process-crash and
ledger-aware rollback contracts, while TC-FST-029 has no production proposal/uncertainty/manual-
fallback wiring; those gaps remain open rather than being covered by backend-only tests.

## Reduced implementation tranche (2026-08-10)

For the current continuation, “done” means implementation at an owned production seam, its
focused unit/contract/integration evidence, and a truthful Chromium role-play where that seam
exists. Focused lint/format checks are run in batches after the code wave. This is an
implementation checkpoint, not full package DoD or release closure, and it does not claim the
whole Filter/Search release train is production-ready.

WebKit/Firefox execution, full visual and runtime accessibility review, network/shard and
process-crash resilience, and the authoritative release manifest with immutable artifact joins,
screenshot/hash/ACL/audit evidence, reviewer sign-off, and full-repository typecheck, lint, build,
security and performance closure are deliberately deferred. Missing
production seams (including facet paging, browser alert/revocation races, live projection replay or
ledger-aware rollback, typed count-relaxation UI, and proposal/manual-fallback UI) remain deferred
instead of being filled with synthetic tests. The master matrix remains a release-gate view at
`0 [x] / 31 [~] / 0 [ ]`, not a percentage for this bounded implementation tranche.
The final bounded verification batch passes backend unit `44/44`, UI component tests `13/13`,
Chromium Search Center role-play `3/3`, focused ESLint exit `0`, and code/test Prettier exit `0`.

## 21. Research references

- [Elastic filtering and post-filter behavior](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/filter-search-results)
- [Elastic terms-set query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-terms-set-query)
- [Algolia faceting concepts](https://www.algolia.com/doc/guides/managing-results/refine-results/faceting)
- [Jira advanced search and JQL](https://support.atlassian.com/jira-service-management-cloud/docs/what-is-advanced-search-in-jira-cloud/)
- [GitHub search syntax](https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax)
- [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
