<script lang="ts">
  import type {
    ActiveFilterChipModel,
    FilterExecutionState,
    FilterResultTotal,
  } from './filter_ui_types'
  import ActiveFilterChips from './active_filter_chips.svelte'
  import FilterSummary from './filter_summary.svelte'

  interface Props {
    title: string
    activeFilters: readonly ActiveFilterChipModel[]
    total: FilterResultTotal
    executionState: FilterExecutionState
    interaction: 'instant' | 'staged'
    nestingSummary?: string
    onRemove?: (chipId: string) => void
    onClear?: () => void
  }

  let {
    title,
    activeFilters,
    total,
    executionState,
    interaction,
    nestingSummary,
    onRemove = () => undefined,
    onClear = () => undefined,
  }: Props = $props()
</script>

<div class="filter-bar" data-interaction={interaction}>
  <div class="bar-heading">
    <div>
      <p class="eyebrow">Discovery controls</p>
      <h2>{title}</h2>
    </div>
    {#if activeFilters.length > 0}
      <button type="button" class="clear-button" onclick={onClear}>Clear all</button>
    {/if}
  </div>
  <FilterSummary
    {total}
    {executionState}
    activeFilterCount={activeFilters.length}
    {nestingSummary}
  />
  <ActiveFilterChips chips={activeFilters} {onRemove} />
</div>

<style>
  .filter-bar {
    display: grid;
    gap: 0.75rem;
    border-block-end: 1px solid var(--filter-line, #d5dbd7);
    padding-block-end: 1rem;
  }
  .bar-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
  }
  .eyebrow {
    margin: 0 0 0.2rem;
    color: var(--filter-accent, #087f5b);
    font-size: 0.66rem;
    font-weight: 820;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    color: var(--filter-ink, #18221d);
    font-size: clamp(1.15rem, 2vw, 1.6rem);
    letter-spacing: -0.025em;
    line-height: 1.1;
  }
  .clear-button {
    border: 0;
    background: transparent;
    color: var(--filter-accent, #087f5b);
    padding: 0.35rem;
    font: inherit;
    font-size: 0.76rem;
    font-weight: 780;
    cursor: pointer;
  }
  .clear-button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 32%, transparent);
    outline-offset: 1px;
  }
</style>
