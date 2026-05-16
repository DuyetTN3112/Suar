# Suar Taxonomy and Metadata Design

**Status:** Proposed target architecture  
**Date:** 2026-08-01  
**Scope:** Canonical classification, multi-label assignments, aliases, hierarchies, provenance,
confidence, review state, and completeness signals consumed by Search and Filter contexts  
**Related:** [Filter Platform](./2026-08-01-filter-platform-design.md),
[Enterprise Search and Discovery](./2026-08-01-enterprise-search-discovery-design.md)

> **Implementation checkpoint — 2026-08-10:** the Task-to-accomplishment taxonomy bridge is an
> internal, snapshot-pinned provenance contract. Public Profile/Search disclosure is still blocked
> until term-level publication, review-state and privacy allowlists exist; existing compatibility
> fields must not be treated as approval of raw taxonomy assignments, evidence references or source
> metadata.
>
> The native Completion Review Package editor mapper also keeps taxonomy/provenance fields out of
> reviewer HTTP responses. This is a reviewer privacy boundary only; it does not approve canonical
> skills, category refs, aliases, source metadata or review state for public Profile/Search disclosure.
>
> Native observation persistence may retain taxonomy/snapshot IDs and hashes in a redacted internal
> audit receipt for provenance, but that receipt is not a public taxonomy projection or publication
> approval.
>
> **Live disclosure audit — 2026-08-10:** anonymous Talent Search still accepts and projects
> taxonomy-bearing skill/category refs, aliases, taxonomy versions, assignment provenance/review
> states and skill-evidence metadata. The talent-search reader now fails closed for terms explicitly
> marked non-public and for terms whose parents are non-public or unresolved, but current term
> contracts and readers still do not provide a publication/privacy allowlist or actor × action ×
> data-class matrix for the remaining fields. These fields remain containment findings rather than
> public-safe evidence. Do not infer `visibility: public` from compatibility mappings; either add
> explicit policy and a dedicated public DTO or fail closed before marking public Profile/Search
> taxonomy gates green.

> **Containment evidence — 2026-08-10:** focused Talent Search integration coverage is `4/4`,
> including a public-term/private-term regression. This proves only that explicit non-public terms
> are excluded from the shared skill document; it does not approve aliases, category refs, taxonomy
> versions, assignment provenance, review/evidence state or other public fields.

## 1. Objective

Suar must preserve everything an entity can legitimately belong to. A filter or search engine
cannot retrieve a result through a label, category, skill, domain, genre, technology, topic, or
other concept that was discarded, flattened into ambiguous text, or never represented.

This design defines a provider-neutral taxonomy and metadata contract. It gives Search and Filter
stable identities, aliases, hierarchies, multi-label assignments, provenance, confidence, review
state, versioning, and completeness signals without moving every domain model into one universal
taxonomy database.

## 2. Decision summary

1. **Canonical identity is not a display label.** Persist namespaced IDs; localize labels at the
   boundary.
2. **Classification is multi-label by default.** A single “primary” term may help presentation but
   never deletes secondary assignments.
3. **Hierarchies are directed acyclic graphs.** A term may have multiple parents and an entity may
   appear through several valid paths.
4. **Assignments carry provenance.** Explicit, imported, derived, and suggested values are not
   equivalent evidence.
5. **Unknown is observable.** Missing, unavailable, stale, unresolved, and not-applicable states are
   distinct internally and privacy-safe externally.
6. **Domains retain ownership.** Existing authoritative concepts such as skills remain in their
   domain; they implement a common taxonomy-provider contract instead of being copied into a
   generic table.
7. **Free-form tags stay separate.** They can coexist with canonical terms but are not silently
   treated as reviewed taxonomy.
8. **Every projection is versioned.** Search documents and filter facets record the taxonomy and
   enrichment versions that produced them.

## 3. Vocabulary

### 3.1 Namespace

A namespace identifies one governed concept family, such as a skill catalog, content genre,
business domain, workflow label system, or organization-specific vocabulary.

### 3.2 Term

A term is a canonical concept with stable identity, lifecycle state, labels, aliases, and optional
hierarchy edges.

### 3.3 Assignment

An assignment connects an entity to a term and records who or what asserted the relationship,
confidence, review status, evidence reference, and validity period.

### 3.4 Alias

An alias is an alternate name, spelling, abbreviation, or translation that resolves to a canonical
term. An alias does not create a second facet bucket.

### 3.5 Hierarchy edge

A directed edge connects a narrower term to a broader term. Multiple parents are allowed; cycles
are not.

### 3.6 Free-form tag

A free-form tag is user-authored metadata without guaranteed canonical meaning. It can later be
linked or promoted through a reviewed workflow, but remains distinguishable from the canonical
term.

## 4. Canonical contracts

```ts
type TaxonomyTermStatus = 'active' | 'deprecated' | 'retired' | 'merged'

interface TaxonomyTermRef {
  namespace: string
  termId: string
}

interface TaxonomyTerm {
  ref: TaxonomyTermRef
  version: number
  status: TaxonomyTermStatus
  labels: Record<string, string>
  aliases: Array<{
    locale?: string
    value: string
    kind: 'synonym' | 'abbreviation' | 'spelling' | 'translation' | 'legacy'
    reviewState: 'reviewed' | 'suggested'
  }>
  parentRefs: TaxonomyTermRef[]
  replacementRefs?: TaxonomyTermRef[]
  metadata?: Record<string, string | number | boolean>
}
```

Assignments use a common semantic envelope while their source-of-truth storage remains domain
owned:

```ts
type AssignmentProvenance = 'explicit' | 'imported' | 'derived' | 'suggested'
type AssignmentReviewState = 'reviewed' | 'pending' | 'disputed' | 'rejected' | 'expired'

interface EntityTaxonomyAssignment {
  resource: string
  entityId: string
  term: TaxonomyTermRef
  provenance: AssignmentProvenance
  reviewState: AssignmentReviewState
  confidence?: number
  sourceType: string
  sourceId?: string
  evidenceRefs?: string[]
  validFrom?: string
  validUntil?: string
  taxonomyVersion: number
  enrichmentVersion?: number
}
```

Confidence is normalized to `[0, 1]` only where the producing domain can defend that meaning. A
missing confidence value is not converted to zero.

## 5. Ownership model

### 5.1 Domain-owned providers

Domains keep authoritative models and publish a `TaxonomyProvider` or `MetadataAssignmentProvider`:

```ts
interface TaxonomyProvider {
  namespace: string
  getVersion(): Promise<number>
  resolveTerms(refs: TaxonomyTermRef[], locale: string): Promise<TaxonomyTerm[]>
  searchTerms(input: TaxonomyTermSearchInput): Promise<TaxonomyTermSearchResult>
  getAncestorPaths(refs: TaxonomyTermRef[]): Promise<TaxonomyTermRef[][]>
  resolveAliases(values: string[], locale?: string): Promise<TaxonomyAliasResolution[]>
}
```

The platform contract must adapt existing catalogs rather than duplicating them. For example, a
domain with rich identity, permissions, and lifecycle remains authoritative for its own concepts.

### 5.2 Shared taxonomy storage

Shared storage is appropriate only for genuinely cross-cutting or administrator-defined concept
families that do not already have a domain owner. It may store terms, labels, aliases, edges,
versions, and migrations. It must not become a backdoor generic entity model.

### 5.3 Entity assignment ownership

Entity domains own explicit assignments and the business rules that create them. Derived projection
builders may aggregate assignments from reviewed evidence, but they do not mutate source truth
unless a domain command explicitly accepts the suggestion.

### 5.4 Task-to-accomplishment snapshot bridge

When a Task assignment is created, the authorized metadata provider may return an assignment result
that is pinned into the immutable Task Assignment Snapshot. The pinned envelope keeps canonical
assignments, free-form tags, taxonomy/enrichment versions, source revision, completeness and
diagnostics together with the resolved Task Contract. This preserves the historical taxonomy input
used by accomplishment projection even if the mutable Task metadata changes later.

The bridge is internal provenance, not a public response contract. Public/Profile/Search consumers
must not copy raw assignment provenance, source identifiers, evidence references, diagnostics or
free-form tags. They require an explicit term-level visibility/publication allowlist and a separate
public-safe mapper; until that policy exists, the public projection may expose only already-approved
compatibility fields.

The same boundary applies when a Project Context is rendered in a project-detail page: Context
content is a separate readable projection and does not authorize disclosure of taxonomy or source
metadata. A future task/accomplishment public mapper must still apply the term-level allowlist; the
page-level Context projection must not be reused as a Search/Profile taxonomy payload.

The same rule applies to the Task authoring context selector: its Work Package/Project Context read
contract is a privacy-safe source/version picker, not a taxonomy API. It may return approved titles,
summaries and immutable version pins, but must not expose raw taxonomy assignments, free-form tags,
source provenance, hashes, actor identity or structured internal defaults. Selecting a package sends
only the version IDs into authoring; public/Profile/Search disclosure remains blocked until the
term-level allowlist and review-state policy are implemented.

## 6. Multi-label and hierarchy semantics

### 6.1 Multi-label preservation

- an entity can have zero, one, or many active assignments in a namespace;
- an optional primary term is a presentation hint only;
- removing a primary term does not remove other assignments;
- indexing and filter projections retain all qualifying canonical IDs;
- completeness fixtures include entities with many labels so accidental truncation fails tests;
- per-namespace assignment limits are explicit and based on real domain constraints, not arbitrary
  UI limits.

### 6.2 Directed acyclic graph

Taxonomy hierarchies support multiple parents. A term can legitimately appear in several paths.

```text
Term C
├── parent A
└── parent B
```

Rules:

- edge writes reject cycles;
- ancestor paths are derived or cached with taxonomy version;
- filtering a parent with descendant expansion matches assignments through every valid path;
- path-specific UI selection remains distinguishable when the same term appears under two parents;
- moving a term is a versioned change and triggers affected projection refresh;
- no consumer assumes one `parent_id` is sufficient unless its namespace explicitly declares a
  strict tree.

### 6.3 Expansion policies

A filter or query can request:

- exact canonical term only;
- term plus descendants;
- broader ancestors for query relaxation;
- reviewed aliases for retrieval;
- related terms only as optional suggestions, never silent strict-filter expansion.

Every expansion is bounded, versioned, and explainable.

## 7. Provenance, confidence, and review

### 7.1 Provenance meanings

- `explicit`: directly asserted through an authorized domain workflow;
- `imported`: received from a known external or migration source;
- `derived`: computed deterministically from owned data or reviewed evidence;
- `suggested`: proposed by a model, heuristic, or user without acceptance as truth.

### 7.2 Review states

- `reviewed`: accepted for the consuming policy;
- `pending`: waiting for review or sufficient evidence;
- `disputed`: challenged and subject to restricted use;
- `rejected`: retained for audit but excluded from active classification;
- `expired`: previously valid but outside its validity window.

Contexts decide which provenance and review combinations count as known truth. A sensitive context
may accept only reviewed assignments, while a discovery context may include high-confidence derived
assignments as preference signals with an explanation.

### 7.3 Machine suggestions

Machine suggestions must:

- remain separate from reviewed assignments;
- record model/rule version and source inputs;
- carry confidence only when calibrated;
- support accept, edit, reject, and audit actions;
- never infer or expose protected or sensitive traits without an approved policy;
- never silently populate a strict filter facet as authoritative truth.

## 8. Missing, unknown, and negative knowledge

The metadata layer distinguishes:

```text
known present       an accepted assignment exists
known absent        the domain explicitly supports and records negative knowledge
missing             no value has been supplied
unknown             available evidence cannot establish truth
unavailable         the current principal may not access the source
stale               the projection is older than its accepted freshness bound
unresolved          a source value cannot map to an active canonical term
not applicable      the field does not apply to this entity/context
```

Known absence is never inferred merely because no positive assignment exists. Most taxonomies use
an open-world assumption: lack of a label means unknown or missing, not false.

Consumer responses collapse internal reasons when necessary to prevent permission leakage. Operator
dashboards retain safe aggregate completeness detail.

## 9. Labels, aliases, and localization

- canonical identity uses namespace plus term ID;
- labels are locale-specific and can change without changing identity;
- a deterministic fallback locale is declared per namespace;
- aliases are normalized for matching but the original user input can be preserved for explanation;
- alias collisions return an ambiguous resolution instead of choosing silently;
- labels and aliases have length, character, and uniqueness policies appropriate to their
  namespace;
- free-form tags are normalized for comparison while preserving display form;
- translations do not create duplicate terms unless the concepts are genuinely different.

## 10. Lifecycle and versioning

### 10.1 Version rules

A taxonomy version changes when term identity, lifecycle, alias resolution, hierarchy edges, or
replacement behavior changes. Label-only corrections may use term revision while preserving the
namespace version policy declared by the provider.

### 10.2 Retirement

A retired term remains resolvable for stored assignments and migrations but is not offered for new
selection. Consumers receive its status and replacement guidance.

### 10.3 Merge

Merging terms records one or more source terms and one canonical replacement. Stored filters and
assignments migrate deterministically while audit history preserves original identity.

### 10.4 Split

A split cannot be migrated blindly because one old term may map to several new meanings. Affected
assignments and saved filters enter a review-required state unless a domain rule can prove the
mapping.

### 10.5 Projection freshness

Every derived Search or Filter projection records:

- source entity revision;
- taxonomy namespace versions;
- enrichment algorithm version;
- projected-at time;
- unresolved and below-threshold assignment counts.

Version drift is measurable and can trigger incremental re-projection or full rebuild.

### 10.6 Filter and Search migration checkpoint

Taxonomy publication follows the cross-version choreography in Filter Platform §12.3. A taxonomy
change is not complete merely because term storage committed. Its migration record includes:

- affected namespaces and old/new versions;
- merge, retirement, hierarchy, label/alias, or split operation type;
- deterministic replacement map where one exists;
- affected assignment, projection, context-schema, saved-view, and alert counts;
- projection rebuild generation and activation state;
- last processed entity/saved-view checkpoint;
- idempotency key, checksum, outcome, and repair count.

Merge and retirement mappings can migrate saved criteria automatically. A split pauses ambiguous
criteria and assignments for repair. Search projection activation waits for completeness and
semantic-conformance gates; Filter context activation waits for a compatible provider binding.
Rollback changes active routing but preserves the published taxonomy audit chain and never silently
restores retired meaning under a reused canonical ID.

## 11. Integration with Filter Platform

Filter context definitions reference semantic term fields and provider namespaces. They do not
embed translated labels or storage paths.

The taxonomy provider supplies:

- option search and labels;
- canonical-ID validation;
- hierarchy expansion;
- retired/merged diagnostics;
- coverage and freshness notices;
- provenance/review filters when exposed by domain policy.

The Filter Platform supplies:

- Any/All/None/Exactly/At-least-N expression semantics;
- missing-data policy;
- URL and saved-view persistence of canonical IDs;
- schema migration orchestration;
- permission-safe facet response behavior.

A saved filter stores canonical term refs and context schema version. It never stores only a label.

## 12. Integration with Search

Search projections store canonical IDs for filtering/aggregation and reviewed labels plus approved
aliases for retrieval:

```text
canonical_term_ids: keyword[]
canonical_labels_text: text
approved_aliases_text: text
ancestor_paths: keyword[]
assignment_provenance: keyword[] when needed
taxonomy_versions: keyword[]
```

Exact tags are not represented only as a whitespace-joined string. Suggested terms remain separate
from accepted assignments. Query expansion uses reviewed aliases and bounded hierarchy rules;
semantic similarity does not rewrite canonical classifications.

## 13. Permission, privacy, and fairness

- term visibility can be public, organization-scoped, private, or policy-restricted;
- the effective provider hides unauthorized terms, labels, aliases, assignments, and counts;
- organization-specific vocabularies do not leak through suggestions or facet counts;
- assignment evidence follows the source domain's permission rules;
- sensitive and protected attributes are excluded from employment/evaluation filtering and ranking;
- inferred proxy traits require explicit review;
- aggregate coverage reporting uses privacy thresholds where small counts could identify people;
- deletion, retention, and correction propagate from the source domain into projections.

## 14. Completeness and quality gates

Track by resource, context, namespace, and projection version:

- percentage missing required concept families;
- average, median, and percentile assignment count;
- percentage with only a primary assignment despite multi-label expectations;
- provenance and review-state distribution;
- unresolved source values and alias collisions;
- orphan terms and edges;
- cycle detection failures;
- retired-term references;
- stale taxonomy/enrichment versions;
- source-to-projection disagreement;
- secondary-label retrieval recall;
- term suggestion accept/edit/reject rate.

Gates fail when:

- a projection loses valid secondary assignments;
- active references cannot resolve;
- hierarchy changes create cycles;
- a source update does not invalidate affected projections;
- a reviewed assignment is downgraded silently;
- sensitive metadata appears in an unauthorized context.

## 15. Operational workflows

Operators need:

- namespace and version inventory;
- term/alias/edge change preview;
- impact count before merge, split, retire, or move;
- affected saved-filter and projection count;
- migration and re-projection status;
- unresolved-value review queue;
- suggested-assignment review queue;
- rollback or forward-fix strategy per published version;
- audit history for governance changes.

Taxonomy mutation is a controlled domain operation, not direct table editing.

## 16. Testing strategy

### 16.1 Contract tests

- canonical ref parsing and namespace isolation;
- locale fallback and alias ambiguity;
- term lifecycle transitions;
- multi-parent ancestor paths and cycle rejection;
- merge, retirement, and split diagnostics;
- provenance/review/confidence validation;
- missing/unknown/not-applicable semantics.

### 16.2 Provider conformance

Every taxonomy provider runs shared fixtures for term resolution, alias search, localization,
hierarchy traversal, version reporting, and unauthorized-value suppression.

### 16.3 Projection tests

- every accepted secondary assignment reaches the filter/search projection;
- canonical IDs and text labels remain separate;
- below-threshold suggestions do not enter strict facets;
- source revisions and taxonomy versions trigger refresh;
- stale and unresolved states appear in completeness metrics.

### 16.4 Migration tests

- saved filters survive label changes and deterministic merges;
- retired terms produce replacement diagnostics;
- splits pause ambiguous saved filters;
- historical audit retains original refs;
- re-projection is resumable and idempotent.

## 17. Delivery strategy

### Phase 0 — Inventory and namespace ownership

1. Inventory existing skill/category/tag/domain/type/status vocabularies and free-form fields.
2. Identify authoritative owners, duplicate concept families, and string-only classifications.
3. Measure multi-label coverage, unresolved values, and projection loss.
4. Assign stable namespace keys and provider responsibilities.

### Phase 1 — Contracts and adapters

1. Implement term-ref, provider, assignment-envelope, lifecycle, and completeness contracts.
2. Adapt existing authoritative catalogs without migrating their source-of-truth storage.
3. Add canonical IDs, provenance, review state, and version data to selected projections.
4. Add shared provider conformance fixtures.

### Phase 2 — Multi-label and hierarchy correctness

1. Preserve all existing explicit assignments.
2. Add alias resolution and multi-parent hierarchy expansion where the product model requires it.
3. Replace ambiguous flattened filter fields with canonical arrays.
4. Add completeness gates and source/projection reconciliation.

### Phase 3 — Governance and enrichment

1. Add controlled term lifecycle, impact preview, migrations, and audit.
2. Add reviewed derived metadata and suggestion queues.
3. Add projection refresh orchestration by taxonomy/enrichment version.
4. Add safe coverage dashboards and unresolved-value workflows.

The implementation plan chooses namespaces incrementally. It must not attempt a big-bang migration
of every label and tag in Suar.

## 18. Acceptance criteria for planning

- every filterable taxonomy value has a stable namespaced identity or is explicitly classified as
  free-form;
- existing domain catalogs can remain authoritative through provider adapters;
- an entity can retain all legitimate assignments and all valid hierarchy paths;
- aliases and translations resolve without creating duplicate facet buckets;
- explicit, imported, derived, and suggested assignments remain distinguishable;
- missing does not mean false;
- term retirement, merge, and split have defined saved-filter and projection behavior;
- Search stores exact canonical arrays separately from retrieval text;
- Filter stores canonical refs and receives hierarchy/coverage diagnostics;
- permissions apply to terms, assignments, suggestions, and counts;
- completeness gates detect secondary-label loss before release.

## 19. Explicit non-goals

- Do not replace every domain catalog with one generic taxonomy table.
- Do not force all namespaces into a tree when the concept model is a graph or flat set.
- Do not treat a primary category as the complete classification.
- Do not merge free-form tags into canonical terms without review.
- Do not use translated labels as persisted identity.
- Do not publish machine suggestions as reviewed truth automatically.
- Do not infer known absence from missing positive assignments.
- Do not expose protected or sensitive inferred traits through Search or Filter.
- Do not migrate every vocabulary in one release.
