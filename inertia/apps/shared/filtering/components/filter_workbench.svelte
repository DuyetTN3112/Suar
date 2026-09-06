<script lang="ts">
  import type {
    ActiveFilterChipModel,
    FilterExecutionState,
    FilterUiDraft,
    FilterUiFacetState,
    FilterUiFieldDefinition,
    FilterResultTotal,
  } from './filter_ui_types'
  import FacetGroup from './facet_group.svelte'
  import FilterBar from './filter_bar.svelte'

  interface Props {
    title: string
    fields: readonly FilterUiFieldDefinition[]
    facets: Readonly<Record<string, FilterUiFacetState>>
    drafts: Readonly<Record<string, FilterUiDraft>>
    activeFilters: readonly ActiveFilterChipModel[]
    total: FilterResultTotal
    executionState: FilterExecutionState
    interaction: 'instant' | 'staged'
    nestingSummary?: string
    onDraftChange: (fieldKey: string, draft: FilterUiDraft) => void
    onRemoveFilter?: (chipId: string) => void
    onClearFilters?: () => void
    onRetryFacet?: (fieldKey: string) => void
  }

  let {
    title,
    fields,
    facets,
    drafts,
    activeFilters,
    total,
    executionState,
    interaction,
    nestingSummary,
    onDraftChange,
    onRemoveFilter = () => undefined,
    onClearFilters = () => undefined,
    onRetryFacet = () => undefined,
  }: Props = $props()
</script>

<section class="filter-workbench" data-filter-interaction={interaction} aria-label={title}>
  <FilterBar
    {title}
    {activeFilters}
    {total}
    {executionState}
    {interaction}
    {nestingSummary}
    onRemove={onRemoveFilter}
    onClear={onClearFilters}
  />

  <div class="field-stack">
    {#each fields as field (field.key)}
      <FacetGroup
        {field}
        draft={drafts[field.key] ?? {
          operator: field.operators[0] ?? 'exact',
          effect: field.effects[0] ?? 'require',
          unknown: field.defaultUnknown,
        }}
        facet={facets[field.key]}
        onChange={onDraftChange}
        {onRetryFacet}
      />
    {/each}
  </div>
</section>

<style>
  .filter-workbench {
    --filter-surface: var(--surface, #fff);
    --filter-soft: var(--surface-subtle, #f1f5f2);
    --filter-ink: var(--foreground, #18221d);
    --filter-muted: var(--muted-foreground, #58645d);
    --filter-line: var(--border, #d5dbd7);
    --filter-accent: var(--primary, #087f5b);
    --filter-on-accent: var(--primary-foreground, #fff);
    display: grid;
    gap: 0;
    min-inline-size: 0;
    border: 1px solid var(--filter-line);
    border-radius: 0.9rem;
    background: var(--filter-surface);
    color: var(--filter-ink);
    padding: clamp(0.85rem, 2vw, 1.25rem);
    font-family: inherit;
  }
  .field-stack {
    display: grid;
    min-inline-size: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .filter-workbench {
      scroll-behavior: auto;
    }
  }
</style>
