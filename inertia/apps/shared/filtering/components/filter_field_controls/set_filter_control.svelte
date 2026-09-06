<script lang="ts">
  import type { FilterFacetValue, FilterUiDraft } from '../filter_ui_types'
  import FacetValueCombobox from '../facet_value_combobox.svelte'

  interface Props {
    id: string
    label: string
    operators: readonly string[]
    values: readonly FilterFacetValue[]
    facetSearchUnavailable?: boolean
    draft: FilterUiDraft
    onChange: (draft: FilterUiDraft) => void
  }

  let {
    id,
    label,
    operators,
    values,
    facetSearchUnavailable = false,
    draft,
    onChange,
  }: Props = $props()
</script>

<div class="set-control">
  <div class="semantics-row">
    <label>
      <span>Selection rule</span>
      <select
        value={draft.operator}
        aria-label={`${label} selection rule`}
        onchange={(event) => onChange({ ...draft, operator: event.currentTarget.value })}
      >
        {#each operators as operator (operator)}
          <option value={operator}>
            {operator === 'contains_any'
              ? 'Any selected value'
              : operator === 'contains_all'
                ? 'All selected values'
                : operator === 'contains_none'
                  ? 'None of the selected values'
                  : operator === 'contains_at_least'
                    ? 'At least N selected values'
                    : operator.replaceAll('_', ' ')}
          </option>
        {/each}
      </select>
    </label>
    {#if draft.operator === 'contains_at_least'}
      <label>
        <span>Minimum matches</span>
        <input
          type="number"
          min="1"
          max={Math.max(1, draft.selectedIds?.length ?? 1)}
          value={draft.minimumMatch ?? 1}
          aria-label={`${label} minimum matches`}
          oninput={(event) =>
            onChange({ ...draft, minimumMatch: Number(event.currentTarget.value) })}
        />
      </label>
    {/if}
    <label>
      <span>Unspecified values</span>
      <select
        value={draft.unknown}
        aria-label={`${label} unspecified values`}
        onchange={(event) =>
          onChange({
            ...draft,
            unknown: event.currentTarget.value as FilterUiDraft['unknown'],
          })}
      >
        <option value="exclude">Exclude unspecified</option>
        <option value="include">Include unspecified</option>
      </select>
    </label>
  </div>

  <FacetValueCombobox
    id={`${id}-values`}
    label={`Search ${label}`}
    {values}
    selectedIds={draft.selectedIds ?? []}
    searchUnavailable={facetSearchUnavailable}
    onSelectionChange={(selectedIds: string[]) => onChange({ ...draft, selectedIds })}
  />
</div>

<style>
  .set-control {
    display: grid;
    gap: 0.8rem;
  }
  .semantics-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.6rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
    color: var(--filter-muted, #58645d);
    font-size: 0.72rem;
    font-weight: 720;
  }
  select,
  input {
    min-inline-size: 0;
    inline-size: 100%;
    border: 1px solid var(--filter-line, #b7c0ba);
    border-radius: 0.55rem;
    background: var(--filter-surface, #fff);
    color: var(--filter-ink, #18221d);
    padding: 0.5rem 0.55rem;
    font: inherit;
    font-weight: 500;
  }
  select:focus-visible,
  input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 32%, transparent);
    outline-offset: 1px;
  }
</style>
