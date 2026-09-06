<script lang="ts">
  import type { FilterFacetValue } from './filter_ui_types'

  interface Props {
    id: string
    label: string
    values: readonly FilterFacetValue[]
    selectedIds: readonly string[]
    searchUnavailable?: boolean
    maxVisible?: number
    onSelectionChange: (selectedIds: string[]) => void
  }

  let {
    id,
    label,
    values,
    selectedIds,
    searchUnavailable = false,
    maxVisible = 100,
    onSelectionChange,
  }: Props = $props()

  let query = $state('')
  let open = $state(false)
  let activeIndex = $state(-1)

  const selectedSet = $derived(new Set(selectedIds))
  const selectedValues = $derived(values.filter((value) => selectedSet.has(value.id)))
  const normalizedQuery = $derived(query.normalize('NFKC').trim().toLocaleLowerCase('en-US'))
  const candidates = $derived(
    values
      .filter(
        (value) =>
          !selectedSet.has(value.id) &&
          (normalizedQuery.length === 0 ||
            value.label.normalize('NFKC').toLocaleLowerCase('en-US').includes(normalizedQuery))
      )
      .slice(0, Math.max(1, maxVisible))
  )
  const listboxId = $derived(`${id}-available-values`)
  const activeOptionId = $derived(
    open && activeIndex >= 0 && candidates[activeIndex]
      ? `${id}-option-${activeIndex}`
      : undefined
  )

  function countLabel(value: FilterFacetValue): string {
    if (value.countRelation === 'unknown' || value.count === null) return 'Count unavailable'
    const formatted = new Intl.NumberFormat('en-US').format(value.count)
    if (value.countRelation === 'approximate') return `About ${formatted} results`
    return `${formatted} ${value.count === 1 ? 'result' : 'results'}, exact`
  }

  function optionName(value: FilterFacetValue): string {
    return `${value.label}, ${countLabel(value)}${value.retired ? ', retired' : ''}`
  }

  function emit(next: readonly string[]): void {
    onSelectionChange([...new Set(next)])
  }

  function select(value: FilterFacetValue): void {
    emit([...selectedIds, value.id])
    query = ''
    activeIndex = Math.min(activeIndex, Math.max(0, candidates.length - 2))
  }

  function remove(value: FilterFacetValue): void {
    emit(selectedIds.filter((selectedId) => selectedId !== value.id))
  }

  function moveActive(delta: number): void {
    if (!open) open = true
    if (candidates.length === 0) {
      activeIndex = -1
      return
    }
    activeIndex =
      activeIndex < 0
        ? delta > 0
          ? 0
          : candidates.length - 1
        : (activeIndex + delta + candidates.length) % candidates.length
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
      return
    }
    if (event.key === 'Home' && open && candidates.length > 0) {
      event.preventDefault()
      activeIndex = 0
      return
    }
    if (event.key === 'End' && open && candidates.length > 0) {
      event.preventDefault()
      activeIndex = candidates.length - 1
      return
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault()
      const active = candidates[activeIndex]
      if (active) select(active)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      open = false
      activeIndex = -1
    }
  }
</script>

<div class="facet-combobox" data-testid="facet-value-combobox">
  {#if selectedValues.length > 0}
    <div class="selected-block">
      <p class="micro-label">Selected</p>
      <div class="option-stack" role="listbox" aria-label={`${label} selected values`} aria-multiselectable="true">
        {#each selectedValues as value (value.id)}
          <button
            type="button"
            class="facet-option selected"
            role="option"
            aria-selected="true"
            aria-label={optionName(value)}
            data-value-id={value.id}
            onclick={() => remove(value)}
          >
            <span class="option-copy">
              <span class="option-label">{value.label}</span>
              {#if value.retired}<span class="retired-badge">Retired</span>{/if}
            </span>
            <span class="count-copy">{countLabel(value)}</span>
            <span class="remove-mark" aria-hidden="true">×</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <label class="micro-label" for={id}>{label}</label>
  <div class="input-shell">
    <span aria-hidden="true" class="search-mark">⌕</span>
    <input
      {id}
      type="search"
      role="combobox"
      aria-label={label}
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={activeOptionId}
      aria-autocomplete="list"
      autocomplete="off"
      disabled={searchUnavailable}
      placeholder="Search values…"
      bind:value={query}
      oninput={() => {
        open = true
        activeIndex = candidates.length > 0 ? 0 : -1
      }}
      onkeydown={handleKeydown}
    />
    <span class="selection-count">{selectedIds.length} selected</span>
  </div>

  {#if searchUnavailable}
    <p class="facet-status" role="status">Facet search unavailable. Your selections are preserved.</p>
  {/if}

  {#if open && !searchUnavailable}
    <div
      id={listboxId}
      class="option-stack available"
      role="listbox"
      aria-label={`${label} available values`}
      aria-multiselectable="true"
    >
      {#each candidates as value, index (value.id)}
        <button
          id={`${id}-option-${index}`}
          type="button"
          class:active={index === activeIndex}
          class="facet-option"
          role="option"
          aria-selected="false"
          aria-label={optionName(value)}
          data-value-id={value.id}
          onclick={() => select(value)}
          onmouseenter={() => (activeIndex = index)}
        >
          <span class="option-copy">
            <span class="option-label">{value.label}</span>
            {#if value.retired}<span class="retired-badge">Retired</span>{/if}
          </span>
          <span class="count-copy">{countLabel(value)}</span>
        </button>
      {:else}
        <p class="empty-copy">No available values match this search.</p>
      {/each}
      {#if values.length - selectedValues.length > candidates.length}
        <p class="bounded-copy">
          Showing the first {candidates.length} values. Refine the search to inspect more.
        </p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .facet-combobox {
    display: grid;
    gap: 0.55rem;
    min-inline-size: 0;
  }

  .micro-label {
    margin: 0;
    color: var(--filter-muted, #58645d);
    font-size: 0.7rem;
    font-weight: 760;
    letter-spacing: 0.08em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .selected-block {
    display: grid;
    gap: 0.4rem;
  }

  .input-shell {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.4rem;
    border: 1px solid var(--filter-line, #b7c0ba);
    border-radius: 0.65rem;
    background: var(--filter-surface, #fff);
    padding-inline: 0.65rem;
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }

  .input-shell:focus-within {
    border-color: var(--filter-accent, #087f5b);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--filter-accent, #087f5b) 18%, transparent);
  }

  .search-mark {
    color: var(--filter-muted, #58645d);
    font-size: 1.1rem;
  }

  input {
    min-inline-size: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: inherit;
    padding-block: 0.65rem;
    font: inherit;
  }

  input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .selection-count {
    color: var(--filter-muted, #58645d);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .option-stack {
    display: grid;
    gap: 0.3rem;
    max-block-size: 20rem;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .option-stack.available {
    border-block-start: 1px solid var(--filter-line, #d5dbd7);
    padding-block-start: 0.45rem;
  }

  .facet-option {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.65rem;
    inline-size: 100%;
    border: 1px solid transparent;
    border-radius: 0.55rem;
    background: transparent;
    color: inherit;
    padding: 0.5rem 0.55rem;
    text-align: start;
    cursor: pointer;
  }

  .facet-option:hover,
  .facet-option.active {
    border-color: var(--filter-line, #b7c0ba);
    background: var(--filter-soft, #f1f5f2);
  }

  .facet-option:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 38%, transparent);
    outline-offset: 1px;
  }

  .facet-option.selected {
    grid-template-columns: minmax(0, 1fr) auto auto;
    border-color: color-mix(in srgb, var(--filter-accent, #087f5b) 45%, transparent);
    background: color-mix(in srgb, var(--filter-accent, #087f5b) 8%, var(--filter-surface, #fff));
  }

  .option-copy {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: 0.4rem;
  }

  .option-label {
    overflow-wrap: anywhere;
  }

  .retired-badge {
    border: 1px solid currentColor;
    border-radius: 999px;
    color: var(--filter-warning, #8a4b08);
    padding: 0.08rem 0.35rem;
    font-size: 0.62rem;
    font-weight: 750;
    text-transform: uppercase;
  }

  .count-copy,
  .bounded-copy,
  .empty-copy,
  .facet-status {
    margin: 0;
    color: var(--filter-muted, #58645d);
    font-size: 0.75rem;
  }

  .count-copy {
    text-align: end;
    white-space: nowrap;
  }

  .remove-mark {
    font-size: 1.05rem;
    line-height: 1;
  }

  .bounded-copy,
  .empty-copy,
  .facet-status {
    padding: 0.45rem 0.55rem;
  }

  .facet-status {
    border-inline-start: 3px solid var(--filter-warning, #8a4b08);
    background: color-mix(in srgb, var(--filter-warning, #8a4b08) 8%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    .input-shell {
      transition: none;
    }
  }
</style>
