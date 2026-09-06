<script lang="ts">
  import type { FilterUiDraft } from '../filter_ui_types'

  interface Props {
    id: string
    label: string
    operators: readonly string[]
    draft: FilterUiDraft
    onChange: (draft: FilterUiDraft) => void
  }

  let { id, label, operators, draft, onChange }: Props = $props()
</script>

<div class="range-grid">
  <label>
    <span>Range rule</span>
    <select
      value={draft.operator}
      aria-label={`${label} range rule`}
      onchange={(event) => onChange({ ...draft, operator: event.currentTarget.value })}
    >
      {#each operators as operator (operator)}
        <option value={operator}>{operator.replaceAll('_', ' ')}</option>
      {/each}
    </select>
  </label>
  <label for={`${id}-minimum`}>
    <span>Minimum</span>
    <input
      id={`${id}-minimum`}
      type="number"
      value={draft.gte ?? ''}
      aria-label={`${label} minimum`}
      oninput={(event) => onChange({ ...draft, gte: event.currentTarget.value })}
    />
  </label>
  <label for={`${id}-maximum`}>
    <span>Maximum</span>
    <input
      id={`${id}-maximum`}
      type="number"
      value={draft.lte ?? ''}
      aria-label={`${label} maximum`}
      oninput={(event) => onChange({ ...draft, lte: event.currentTarget.value })}
    />
  </label>
  <label>
    <span>Unspecified values</span>
    <select
      value={draft.unknown}
      aria-label={`${label} unspecified values`}
      onchange={(event) =>
        onChange({ ...draft, unknown: event.currentTarget.value as FilterUiDraft['unknown'] })}
    >
      <option value="exclude">Exclude unspecified</option>
      <option value="include">Include unspecified</option>
    </select>
  </label>
</div>

<style>
  .range-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
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
