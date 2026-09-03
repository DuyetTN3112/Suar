<script lang="ts">
  import type { FilterStateController } from '../filter_state.svelte'

  let { state }: { state: FilterStateController<string> } = $props()

  const draftField = $derived.by(() => {
    const expression = state.draftCriteria.filter
    return expression?.kind === 'condition' ? expression.field : 'none'
  })
</script>

<output data-testid="draft-field">{draftField}</output>
<output data-testid="dirty-state">{state.hasDirtyDraft ? 'dirty' : 'clean'}</output>
<output data-testid="loading-state">{state.isLoading ? 'loading' : 'idle'}</output>
<output data-testid="latest-response">{state.latestResponse ?? 'none'}</output>
<output data-testid="diagnostic-code">{state.diagnostics[0]?.code ?? 'none'}</output>
