<script lang="ts">
  import type { FilterUiDraft } from '../filter_ui_types'

  interface Props {
    id: string
    label: string
    draft: FilterUiDraft
    onChange: (draft: FilterUiDraft) => void
  }

  let { id, label, draft, onChange }: Props = $props()
</script>

<label class="missing-control" for={`${id}-missing`}>
  <input
    id={`${id}-missing`}
    type="checkbox"
    checked={draft.missing ?? draft.operator === 'missing'}
    onchange={(event) =>
      onChange({
        ...draft,
        missing: event.currentTarget.checked,
        operator: event.currentTarget.checked ? 'missing' : 'exists',
      })}
  />
  <span>
    <strong>Include items with unspecified {label.toLocaleLowerCase('en-US')}</strong>
    <small>Missing metadata remains distinct from a known empty value.</small>
  </span>
</label>

<style>
  .missing-control {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    border-inline-start: 3px solid var(--filter-accent, #087f5b);
    background: var(--filter-soft, #f1f5f2);
    padding: 0.7rem 0.8rem;
    cursor: pointer;
  }
  input {
    margin-block-start: 0.2rem;
    accent-color: var(--filter-accent, #087f5b);
  }
  span {
    display: grid;
    gap: 0.2rem;
  }
  strong {
    font-size: 0.84rem;
  }
  small {
    color: var(--filter-muted, #58645d);
    line-height: 1.45;
  }
</style>
