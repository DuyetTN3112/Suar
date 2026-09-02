<script lang="ts">
  import { AlertTriangle, Wrench, X } from 'lucide-svelte'
  import type { FilterCriteria, FilterExpression, FilterValue } from '../../contracts'
  import type { FilterSavedViewDto } from '../../saved_views/filter_saved_view_client'

  interface Props {
    view: FilterSavedViewDto
    open: boolean
    onClose: () => void
    onRepair: (id: string, repairedCriteria: FilterCriteria) => Promise<void>
    onResumeAlert?: () => Promise<void>
  }

  let { view, open, onClose, onRepair, onResumeAlert }: Props = $props()

  let isSubmitting = $state(false)
  let errorMessage = $state<string | null>(null)
  let replacements = $state<Record<string, string>>({})
  let repaired = $state(false)
  let alertResumed = $state(false)

  function taxonomyTermIds(expression: FilterExpression | undefined): string[] {
    if (!expression) return []
    if (expression.kind === 'group') {
      return expression.children.flatMap((child) => taxonomyTermIds(child))
    }
    if (!expression.field.startsWith('taxonomy.') || !expression.value) return []
    return taxonomyTermIdsFromValue(expression.value)
  }

  function taxonomyTermIdsFromValue(value: FilterValue): string[] {
    switch (value.kind) {
      case 'scalar':
        return typeof value.value === 'string' ? [value.value] : []
      case 'set':
        return value.values.filter((entry): entry is string => typeof entry === 'string')
      case 'hierarchy':
        return value.termIds
      case 'relation':
        return taxonomyTermIds(value.expression)
      case 'range':
      case 'relative_time':
        return []
    }
  }

  function rewriteTaxonomyValue(value: FilterValue, selectedReplacements: Readonly<Record<string, string>>): FilterValue {
    switch (value.kind) {
      case 'scalar':
        if (typeof value.value !== 'string') return value
        const scalarReplacement = selectedReplacements[value.value]
        return scalarReplacement ? { ...value, value: scalarReplacement } : value
      case 'set':
        return {
          ...value,
          values: value.values.map((entry) => typeof entry === 'string' && selectedReplacements[entry] ? selectedReplacements[entry] : entry),
        }
      case 'hierarchy':
        return { ...value, termIds: value.termIds.map((termId) => selectedReplacements[termId] || termId) }
      case 'relation':
        return { ...value, expression: rewriteTaxonomyExpression(value.expression, selectedReplacements) }
      case 'range':
      case 'relative_time':
        return value
    }
  }

  function rewriteTaxonomyExpression(expression: FilterExpression, selectedReplacements: Readonly<Record<string, string>>): FilterExpression {
    if (expression.kind === 'group') {
      return { ...expression, children: expression.children.map((child) => rewriteTaxonomyExpression(child, selectedReplacements)) }
    }
    if (!expression.field.startsWith('taxonomy.') || !expression.value) return expression
    return { ...expression, value: rewriteTaxonomyValue(expression.value, selectedReplacements) }
  }

  const repairableTermIds = $derived([...new Set(taxonomyTermIds(view.criteria.filter))])
  const replacementsComplete = $derived(repairableTermIds.every((termId) => replacements[termId]?.trim()))
  const canResumePausedAlert = $derived(repaired && !alertResumed && view.alertStatus === 'paused' && onResumeAlert !== undefined)

  $effect(() => {
    replacements = Object.fromEntries(repairableTermIds.map((termId) => [termId, '']))
    repaired = false
    alertResumed = false
    errorMessage = null
  })

  async function handleRepair() {
    isSubmitting = true
    errorMessage = null
    try {
      const repairedCriteria: FilterCriteria = {
        ...view.criteria,
        schemaVersion: view.schemaVersion,
        ...(view.criteria.filter
          ? { filter: rewriteTaxonomyExpression(view.criteria.filter, replacements) }
          : {}),
      }
      await onRepair(view.id, repairedCriteria)
      repaired = true
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to repair view'
    } finally {
      isSubmitting = false
    }
  }

  async function handleResumeAlert() {
    if (!onResumeAlert) return
    isSubmitting = true
    errorMessage = null
    try {
      await onResumeAlert()
      alertResumed = true
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to resume alert'
    } finally {
      isSubmitting = false
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <div class="flex items-center gap-2">
          <AlertTriangle class="size-5 text-amber-500" />
          <h3 class="text-lg font-black text-foreground">Saved View Requires Repair</h3>
        </div>
        <button type="button" onclick={onClose} class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X class="size-5" />
        </button>
      </div>

      <div class="mt-4 space-y-3 text-sm">
        <p class="text-foreground">
          The saved view <span class="font-bold">"{view.name}"</span> contains criteria or taxonomy terms that were retired or modified in a schema update.
        </p>

        <div class="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-1">
          <div class="font-mono text-muted-foreground">Migration state: <span class="font-bold text-foreground">{view.migrationState}</span></div>
          <div class="font-mono text-muted-foreground">Schema version: <span class="font-bold text-foreground">{view.schemaVersion}</span></div>
          {#if view.alertReason}
            <div class="font-mono text-amber-500">Reason: {view.alertReason}</div>
          {/if}
        </div>

        {#if repairableTermIds.length > 0}
          <fieldset class="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <legend class="px-1 text-xs font-bold text-foreground">Choose replacements</legend>
            <p class="text-xs text-muted-foreground">Choose the intended replacement for every shown taxonomy term. The system will not infer C or D on your behalf.</p>
            {#each repairableTermIds as termId (termId)}
              <div>
                <label class="mb-1 block font-mono text-xs font-semibold text-foreground" for={`taxonomy-replacement-${termId}`}>Replace {termId} with</label>
                <input
                  id={`taxonomy-replacement-${termId}`}
                  type="text"
                  value={replacements[termId] ?? ''}
                  oninput={(event) => { replacements = { ...replacements, [termId]: event.currentTarget.value } }}
                  placeholder="Canonical replacement term ID"
                  class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  disabled={isSubmitting || repaired}
                />
              </div>
            {/each}
          </fieldset>
        {:else}
          <p class="text-xs text-muted-foreground leading-relaxed">No taxonomy term IDs are present in this saved view. Revalidate the saved view to clear a compatible repair state.</p>
        {/if}

        {#if repaired}
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800" role="status">
            Saved view revalidated. {#if canResumePausedAlert}Its alert remains paused until you explicitly resume it.{:else if alertResumed}Its paused alert has been explicitly resumed.{/if}
          </div>
        {/if}

        {#if errorMessage}
          <div class="rounded-xl border border-border bg-secondary/40 p-3 text-xs font-semibold text-foreground">
            {errorMessage}
          </div>
        {/if}
      </div>

      <div class="mt-6 flex justify-end gap-2 pt-4 border-t border-border">
        <button
          type="button"
          onclick={onClose}
          class="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
        {#if canResumePausedAlert}
          <button
            type="button"
            disabled={isSubmitting}
            onclick={handleResumeAlert}
            class="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Resuming...' : 'Resume paused alert'}</span>
          </button>
        {:else if !repaired}
          <button
            type="button"
            disabled={isSubmitting || !replacementsComplete}
            onclick={handleRepair}
            class="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            <Wrench class="size-4" />
            <span>{isSubmitting ? 'Repairing...' : 'Repair & Revalidate View'}</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
