<script lang="ts">
  import type { FilterExecutionState, FilterResultTotal } from './filter_ui_types'

  interface Props {
    total: FilterResultTotal
    executionState: FilterExecutionState
    activeFilterCount: number
    nestingSummary?: string
  }

  let { total, executionState, activeFilterCount, nestingSummary }: Props = $props()

  const totalCopy = $derived.by(() => {
    if (total.relation === 'unknown' || total.value === null) return 'Result count unavailable'
    const formatted = new Intl.NumberFormat('en-US').format(total.value)
    return total.relation === 'gte' ? `At least ${formatted} results` : `${formatted} results`
  })

  const stateCopy = $derived.by(() => {
    if (executionState === 'loading') return 'Updating results'
    if (executionState === 'error') return 'Results could not be updated'
    if (executionState === 'degraded') return 'Results are using a degraded source'
    if (executionState === 'partial') return 'Some result sources are incomplete'
    return ''
  })
</script>

<div class="filter-summary" role="status" aria-live="polite" aria-atomic="true">
  <span class="total-copy">{totalCopy}</span>
  <span class="filter-count">
    {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
  </span>
  {#if stateCopy}<span class:danger={executionState === 'error'}>{stateCopy}</span>{/if}
  {#if nestingSummary}<span class="sr-only">{nestingSummary}</span>{/if}
</div>

<style>
  .filter-summary {
    display: flex;
    min-inline-size: 0;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.65rem;
    color: var(--filter-muted, #58645d);
    font-size: 0.75rem;
  }
  .total-copy {
    color: var(--filter-ink, #18221d);
    font-weight: 780;
  }
  .filter-count {
    border-inline-start: 1px solid var(--filter-line, #b7c0ba);
    padding-inline-start: 0.65rem;
  }
  .danger {
    color: var(--filter-danger, #b42318);
    font-weight: 720;
  }
  .sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
