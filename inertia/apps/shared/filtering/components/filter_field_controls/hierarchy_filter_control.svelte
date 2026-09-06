<script lang="ts">
  import type { FilterHierarchyOption, FilterUiDraft } from '../filter_ui_types'

  interface Props {
    label: string
    operators: readonly string[]
    options: readonly FilterHierarchyOption[]
    draft: FilterUiDraft
    onChange: (draft: FilterUiDraft) => void
  }

  let { label, operators, options, draft, onChange }: Props = $props()

  function toggle(id: string): void {
    const selected = new Set(draft.selectedIds ?? [])
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    onChange({ ...draft, selectedIds: [...selected] })
  }
</script>

<div class="hierarchy-control">
  <div class="semantics-row">
    <label>
      <span>Hierarchy rule</span>
      <select
        value={draft.operator}
        aria-label={`${label} hierarchy rule`}
        onchange={(event) => onChange({ ...draft, operator: event.currentTarget.value })}
      >
        {#each operators as operator (operator)}
          <option value={operator}>{operator.replaceAll('_', ' ')}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Path expansion</span>
      <select
        value={draft.expansion ?? 'exact'}
        aria-label={`${label} path expansion`}
        onchange={(event) =>
          onChange({
            ...draft,
            expansion: event.currentTarget.value as NonNullable<FilterUiDraft['expansion']>,
          })}
      >
        <option value="exact">Exact terms</option>
        <option value="descendants">Include descendants</option>
        <option value="ancestors">Include ancestors</option>
      </select>
    </label>
  </div>

  <div class="tree" role="tree" aria-label={`${label} hierarchy`} aria-multiselectable="true">
    {#each options as option (option.id)}
      <div
        class="tree-item"
        role="treeitem"
        aria-level={Math.max(1, option.depth + 1)}
        aria-selected={(draft.selectedIds ?? []).includes(option.id)}
        style={`--tree-depth: ${Math.max(0, option.depth)}`}
        data-value-id={option.id}
      >
        <label>
          <input
            type="checkbox"
            checked={(draft.selectedIds ?? []).includes(option.id)}
            onchange={() => toggle(option.id)}
          />
          <span>{option.label}</span>
        </label>
        {#if option.retired}<span class="retired">Retired</span>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .hierarchy-control {
    display: grid;
    gap: 0.7rem;
  }
  .semantics-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.6rem;
  }
  .semantics-row label {
    display: grid;
    gap: 0.3rem;
    color: var(--filter-muted, #58645d);
    font-size: 0.72rem;
    font-weight: 720;
  }
  select {
    inline-size: 100%;
    border: 1px solid var(--filter-line, #b7c0ba);
    border-radius: 0.55rem;
    background: var(--filter-surface, #fff);
    color: var(--filter-ink, #18221d);
    padding: 0.5rem 0.55rem;
    font: inherit;
    font-weight: 500;
  }
  .tree {
    display: grid;
    max-block-size: 16rem;
    overflow: auto;
    border-block: 1px solid var(--filter-line, #d5dbd7);
    padding-block: 0.35rem;
  }
  .tree-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-block: 0.4rem;
    padding-inline-start: calc(0.45rem + var(--tree-depth) * 1rem);
    padding-inline-end: 0.45rem;
    cursor: pointer;
  }
  .tree-item label {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .tree-item:hover {
    background: var(--filter-soft, #f1f5f2);
  }
  .retired {
    margin-inline-start: auto;
    color: var(--filter-warning, #8a4b08);
    font-size: 0.68rem;
    font-weight: 750;
    text-transform: uppercase;
  }
</style>
