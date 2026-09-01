<script lang="ts">
  import type { ActiveFilterChipModel } from './filter_ui_types'

  interface Props {
    chips: readonly ActiveFilterChipModel[]
    onRemove?: (chipId: string) => void
    emptyLabel?: string
  }

  let { chips, onRemove = () => undefined, emptyLabel = 'No active filters' }: Props = $props()

  function valueLabels(chip: ActiveFilterChipModel): string {
    return chip.values.map(({ label }) => label).join(', ')
  }

  function semanticSummary(chip: ActiveFilterChipModel): string {
    const values = valueLabels(chip)
    const rule =
      chip.operator === 'contains_any'
        ? `Any of ${values}`
        : chip.operator === 'contains_all'
          ? `All of ${values}`
          : chip.operator === 'contains_none'
            ? `None of ${values}`
            : chip.operator === 'contains_at_least'
              ? `At least ${chip.minimumMatch ?? 1} of ${values}`
              : values.length > 0
                ? `${chip.operator.replaceAll('_', ' ')} ${values}`
                : chip.operator.replaceAll('_', ' ')
    return chip.effect === 'exclude' ? `Exclude · ${rule}` : rule
  }
</script>

<div class="chip-region" aria-label="Active filters">
  {#if chips.length === 0}
    <p class="empty-copy">{emptyLabel}</p>
  {:else}
    <ul>
      {#each chips as chip (chip.id)}
        <li
          data-field-key={chip.fieldKey}
          data-value-ids={chip.values.map(({ id }) => id).join(',')}
          data-nested-depth={chip.nestedDepth ?? 0}
        >
          <span class="chip-copy">
            <strong>{chip.fieldLabel}</strong>
            <span>{semanticSummary(chip)}</span>
            <small>
              {chip.unknown === 'include'
                ? 'Include unspecified values'
                : 'Exclude unspecified values'}
            </small>
          </span>
          <button
            type="button"
            aria-label={`Remove ${chip.fieldLabel} filter`}
            onclick={() => onRemove(chip.id)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .chip-region {
    min-inline-size: 0;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.45rem;
    max-inline-size: min(100%, 32rem);
    border: 1px solid color-mix(in srgb, var(--filter-accent, #087f5b) 42%, transparent);
    border-radius: 0.7rem;
    background: color-mix(in srgb, var(--filter-accent, #087f5b) 7%, var(--filter-surface, #fff));
    padding-block: 0.38rem;
    padding-inline-start: 0.6rem;
    padding-inline-end: 0.3rem;
  }
  .chip-copy {
    display: flex;
    min-inline-size: 0;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.45rem;
    overflow-wrap: anywhere;
    font-size: 0.76rem;
  }
  strong {
    color: var(--filter-ink, #18221d);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  small {
    inline-size: 100%;
    color: var(--filter-muted, #58645d);
    font-size: 0.65rem;
  }
  button {
    display: grid;
    place-items: center;
    inline-size: 1.65rem;
    block-size: 1.65rem;
    border: 0;
    border-radius: 0.45rem;
    background: transparent;
    color: var(--filter-muted, #58645d);
    font: inherit;
    font-size: 1rem;
    cursor: pointer;
  }
  button:hover {
    background: color-mix(in srgb, var(--filter-accent, #087f5b) 12%, transparent);
    color: var(--filter-ink, #18221d);
  }
  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 32%, transparent);
    outline-offset: 1px;
  }
  .empty-copy {
    margin: 0;
    color: var(--filter-muted, #58645d);
    font-size: 0.78rem;
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
</style>
