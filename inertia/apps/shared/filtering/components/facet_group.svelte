<script lang="ts">
  import type {
    FilterUiDraft,
    FilterUiFacetState,
    FilterUiFieldDefinition,
  } from './filter_ui_types'
  import DateFilterControl from './filter_field_controls/date_filter_control.svelte'
  import HierarchyFilterControl from './filter_field_controls/hierarchy_filter_control.svelte'
  import MissingFilterControl from './filter_field_controls/missing_filter_control.svelte'
  import RangeFilterControl from './filter_field_controls/range_filter_control.svelte'
  import SetFilterControl from './filter_field_controls/set_filter_control.svelte'
  import TextFilterControl from './filter_field_controls/text_filter_control.svelte'

  interface Props {
    field: FilterUiFieldDefinition
    draft: FilterUiDraft
    facet?: FilterUiFacetState
    onChange: (fieldKey: string, draft: FilterUiDraft) => void
    onRetryFacet?: (fieldKey: string) => void
  }

  let { field, draft, facet, onChange, onRetryFacet = () => undefined }: Props = $props()
  const headingId = $derived(`filter-field-${field.key}-heading`)
</script>

<section
  class="facet-group"
  data-testid="filter-field"
  data-field-key={field.key}
  aria-labelledby={headingId}
>
  <header class="facet-heading">
    <div>
      <p class="field-key" aria-hidden="true">{field.key}</p>
      <h3 id={headingId}>{field.label}</h3>
      {#if field.description}<p class="description">{field.description}</p>{/if}
    </div>
    {#if facet?.status === 'loading'}
      <span class="state-badge" role="status">Loading values…</span>
    {:else if facet?.status === 'partial'}
      <span class="state-badge warning">Partial values</span>
    {/if}
  </header>

  <div class="facet-body" data-testid={`filter-field-${field.key}`}>
    {#if facet?.status === 'error'}
      <div class="facet-error" role="alert">
        <span>{facet.message ?? 'Facet values are temporarily unavailable. Existing selections are preserved.'}</span>
        <button type="button" onclick={() => onRetryFacet(field.key)}>Retry</button>
      </div>
    {/if}

    {#if field.type === 'text'}
      <TextFilterControl
        id={`filter-${field.key}`}
        label={field.label}
        operators={field.operators}
        effects={field.effects}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {:else if field.type === 'multi_value' || field.type === 'scalar' || field.type === 'boolean'}
      <SetFilterControl
        id={`filter-${field.key}`}
        label={field.label}
        operators={field.operators}
        values={facet?.values ?? []}
        facetSearchUnavailable={facet?.status === 'error'}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {:else if field.type === 'number'}
      <RangeFilterControl
        id={`filter-${field.key}`}
        label={field.label}
        operators={field.operators}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {:else if field.type === 'date_time'}
      <DateFilterControl
        id={`filter-${field.key}`}
        label={field.label}
        operators={field.operators}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {:else if field.type === 'hierarchy'}
      <HierarchyFilterControl
        label={field.label}
        operators={field.operators}
        options={field.hierarchyOptions ?? []}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {:else}
      <MissingFilterControl
        id={`filter-${field.key}`}
        label={field.label}
        {draft}
        onChange={(next: FilterUiDraft) => onChange(field.key, next)}
      />
    {/if}
  </div>
</section>

<style>
  .facet-group {
    display: grid;
    gap: 0.85rem;
    border-block-start: 1px solid var(--filter-line, #d5dbd7);
    padding-block: 1rem;
  }
  .facet-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  .facet-body {
    display: grid;
    gap: 0.75rem;
    min-inline-size: 0;
  }
  .field-key {
    margin: 0 0 0.2rem;
    color: var(--filter-muted, #58645d);
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 0.64rem;
    letter-spacing: 0.04em;
    overflow-wrap: anywhere;
  }
  h3 {
    margin: 0;
    color: var(--filter-ink, #18221d);
    font-size: 0.96rem;
    line-height: 1.25;
  }
  .description {
    max-inline-size: 48rem;
    margin: 0.3rem 0 0;
    color: var(--filter-muted, #58645d);
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .state-badge {
    flex: none;
    border: 1px solid var(--filter-line, #b7c0ba);
    border-radius: 999px;
    padding: 0.2rem 0.45rem;
    color: var(--filter-muted, #58645d);
    font-size: 0.66rem;
    font-weight: 750;
  }
  .state-badge.warning {
    color: var(--filter-warning, #8a4b08);
  }
  .facet-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-inline-start: 3px solid var(--filter-danger, #b42318);
    background: color-mix(in srgb, var(--filter-danger, #b42318) 7%, transparent);
    padding: 0.6rem 0.7rem;
    color: var(--filter-danger, #8f1d15);
    font-size: 0.78rem;
  }
  .facet-error button {
    border: 1px solid currentColor;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    padding: 0.25rem 0.55rem;
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
    }
  }
</style>
