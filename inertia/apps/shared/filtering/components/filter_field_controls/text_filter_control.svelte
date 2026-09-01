<script lang="ts">
  import type { FilterUiDraft } from '../filter_ui_types'

  interface Props {
    id: string
    label: string
    operators: readonly string[]
    effects: readonly ('require' | 'exclude')[]
    draft: FilterUiDraft
    onChange: (draft: FilterUiDraft) => void
  }

  let { id, label, operators, effects, draft, onChange }: Props = $props()
</script>

<div class="control-grid">
  <label class="value-field" for={`${id}-value`}>
    <span>Text value</span>
    <input
      id={`${id}-value`}
      type="text"
      value={draft.scalar ?? ''}
      aria-label={`${label} text value`}
      oninput={(event) => onChange({ ...draft, scalar: event.currentTarget.value })}
    />
  </label>
  <label>
    <span>Match</span>
    <select
      value={draft.operator}
      aria-label={`${label} match operator`}
      onchange={(event) => onChange({ ...draft, operator: event.currentTarget.value })}
    >
      {#each operators as operator (operator)}
        <option value={operator}>{operator.replaceAll('_', ' ')}</option>
      {/each}
    </select>
  </label>
  <label>
    <span>Effect</span>
    <select
      value={draft.effect}
      aria-label={`${label} effect`}
      onchange={(event) =>
        onChange({ ...draft, effect: event.currentTarget.value as FilterUiDraft['effect'] })}
    >
      {#each effects as effect (effect)}
        <option value={effect}>{effect === 'require' ? 'Must match' : 'Exclude match'}</option>
      {/each}
    </select>
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
  .control-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
    min-inline-size: 0;
    color: var(--filter-muted, #58645d);
    font-size: 0.72rem;
    font-weight: 720;
  }
  .value-field {
    grid-column: 1 / -1;
  }
  input,
  select {
    min-inline-size: 0;
    inline-size: 100%;
    border: 1px solid var(--filter-line, #b7c0ba);
    border-radius: 0.55rem;
    background: var(--filter-surface, #fff);
    color: var(--filter-ink, #18221d);
    padding: 0.55rem 0.6rem;
    font: inherit;
    font-weight: 500;
  }
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 32%, transparent);
    outline-offset: 1px;
  }
  @media (max-width: 38rem) {
    .control-grid {
      grid-template-columns: 1fr;
    }
    .value-field {
      grid-column: auto;
    }
  }
</style>
