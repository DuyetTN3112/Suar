<script lang="ts">
  import { X, Users, Building, Lock } from 'lucide-svelte'
  import type {
    FilterSavedViewDto,
    SavedViewGrant,
    SavedViewShareScope,
    SavedViewShareTarget,
    SavedViewVisibility,
  } from '../../saved_views/filter_saved_view_client'
  import type { SavedViewShareConflict } from '../../saved_views/filter_saved_view_state.svelte'

  interface Props {
    view: FilterSavedViewDto
    open: boolean
    onClose: () => void
    onShare: (id: string, grants: SavedViewGrant[], visibility: SavedViewVisibility, scope: SavedViewShareScope) => Promise<void>
    targets?: readonly SavedViewShareTarget[]
    conflict?: SavedViewShareConflict | null
    onReloadConflict?: () => Promise<void>
    onReapplyConflict?: () => Promise<void>
  }

  let {
    view,
    open,
    onClose,
    onShare,
    targets = [],
    conflict = null,
    onReloadConflict,
    onReapplyConflict,
  }: Props = $props()

  let visibility = $state<SavedViewVisibility>('private')
  let selectedTargetId = $state<string | null>(null)
  let isSubmitting = $state(false)
  let isRecovering = $state(false)
  let errorMessage = $state<string | null>(null)
  let initializedViewId = $state<string | null>(null)

  const shareTargets = $derived.by(() => {
    const currentTargets: SavedViewShareTarget[] = []
    if (view.organizationId) {
      currentTargets.push({ type: 'organization', id: view.organizationId, label: view.organizationId })
    }
    if (view.teamId && view.organizationId) {
      currentTargets.push({
        type: 'team',
        id: view.teamId,
        label: view.teamId,
        organizationId: view.organizationId,
      })
    }
    for (const grant of view.grants ?? []) {
      if (grant.target.type === 'organization') {
        currentTargets.push({ type: 'organization', id: grant.target.id, label: grant.target.id })
      }
      if (grant.target.type === 'team' && view.organizationId) {
        currentTargets.push({
          type: 'team',
          id: grant.target.id,
          label: grant.target.id,
          organizationId: view.organizationId,
        })
      }
    }
    return [...targets, ...currentTargets].filter(
      (target, index, values) => values.findIndex((item) => item.type === target.type && item.id === target.id) === index
    )
  })

  const availableTargets = $derived(
    shareTargets.filter((target) => target.type === visibility)
  )
  const selectedTarget = $derived(
    availableTargets.find((target) => target.id === selectedTargetId) ?? null
  )

  $effect(() => {
    if (view && initializedViewId !== view.id) {
      visibility = view.visibility
      selectedTargetId = view.visibility === 'organization'
        ? view.organizationId
        : view.visibility === 'team'
          ? view.teamId
          : null
      initializedViewId = view.id
    }
  })

  function selectVisibility(nextVisibility: SavedViewVisibility) {
    visibility = nextVisibility
    selectedTargetId = shareTargets.find((target) => target.type === nextVisibility)?.id ?? null
    errorMessage = null
  }

  function selectedScope(): SavedViewShareScope | null {
    if (visibility === 'private') return { organizationId: null, teamId: null }
    if (!selectedTarget) return null
    return selectedTarget.type === 'organization'
      ? { organizationId: selectedTarget.id, teamId: null }
      : {
          organizationId: selectedTarget.organizationId,
          teamId: selectedTarget.id,
        }
  }

  async function handleSave() {
    const scope = selectedScope()
    if (!scope) {
      errorMessage = 'Choose an authorized organization or team before sharing this view.'
      return
    }
    isSubmitting = true
    errorMessage = null
    try {
      const grants: SavedViewGrant[] = visibility === 'private' || !selectedTarget
        ? []
        : [{ target: { type: selectedTarget.type, id: selectedTarget.id }, read: true, edit: false, share: false, subscribe: false }]
      await onShare(view.id, grants, visibility, scope)
      onClose()
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to share view'
    } finally {
      isSubmitting = false
    }
  }

  async function handleReloadConflict() {
    if (!onReloadConflict) return
    isRecovering = true
    errorMessage = null
    try {
      await onReloadConflict()
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to reload current permissions'
    } finally {
      isRecovering = false
    }
  }

  async function handleReapplyConflict() {
    if (!onReapplyConflict) return
    isRecovering = true
    errorMessage = null
    try {
      await onReapplyConflict()
      onClose()
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to reapply permissions'
    } finally {
      isRecovering = false
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <h3 class="text-lg font-black text-foreground">Share Saved View</h3>
        <button type="button" onclick={onClose} class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X class="size-5" />
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1" for="saved-view-name">
            View Name
          </label>
          <div id="saved-view-name" class="text-sm font-semibold text-foreground">{view.name}</div>
        </div>

        <div>
          <span class="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Visibility Scope
          </span>
          <div class="grid gap-2" role="radiogroup" aria-label="Visibility scope">
            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'private'}
              onclick={() => { selectVisibility('private') }}
              class={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                visibility === 'private' ? 'border-foreground bg-muted/30 font-bold' : 'border-border hover:bg-muted/10'
              }`}
            >
              <Lock class="size-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-semibold text-foreground">Private</div>
                <div class="text-xs text-muted-foreground">Only you can view and use this saved view</div>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'team'}
              onclick={() => { selectVisibility('team') }}
              class={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                visibility === 'team' ? 'border-foreground bg-muted/30 font-bold' : 'border-border hover:bg-muted/10'
              }`}
            >
              <Users class="size-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-semibold text-foreground">Team</div>
                <div class="text-xs text-muted-foreground">Shared with members of your current team</div>
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={visibility === 'organization'}
              onclick={() => { selectVisibility('organization') }}
              class={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                visibility === 'organization' ? 'border-foreground bg-muted/30 font-bold' : 'border-border hover:bg-muted/10'
              }`}
            >
              <Building class="size-5 text-muted-foreground" />
              <div>
                <div class="text-sm font-semibold text-foreground">Organization</div>
                <div class="text-xs text-muted-foreground">Shared with everyone in your organization</div>
              </div>
            </button>
          </div>
        </div>

        {#if visibility !== 'private'}
          <div>
            <span class="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Share target
            </span>
            {#if availableTargets.length > 0}
              <div class="grid gap-2" role="radiogroup" aria-label="Share target">
                {#each availableTargets as target (target.id)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedTargetId === target.id}
                    onclick={() => { selectedTargetId = target.id; errorMessage = null }}
                    class={`rounded-xl border p-3 text-left text-sm transition ${
                      selectedTargetId === target.id
                        ? 'border-foreground bg-muted/30 font-bold'
                        : 'border-border hover:bg-muted/10'
                    }`}
                  >
                    {target.label}
                  </button>
                {/each}
              </div>
            {:else}
              <p class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground">
                This surface did not provide an authorized {visibility} target. Sharing is unavailable until it does.
              </p>
            {/if}
          </div>
        {/if}

        {#if conflict?.viewId === view.id}
          <div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground" role="alert">
            <p class="font-semibold">This saved view changed elsewhere. Reload the latest permissions before choosing whether to reapply your settings.</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isRecovering}
                onclick={handleReloadConflict}
                class="rounded-lg border border-border px-3 py-1.5 font-bold hover:bg-muted disabled:opacity-50"
              >
                Reload latest permissions
              </button>
              <button
                type="button"
                disabled={isRecovering || !conflict.latest}
                onclick={handleReapplyConflict}
                class="rounded-lg border border-border px-3 py-1.5 font-bold hover:bg-muted disabled:opacity-50"
              >
                Reapply my permissions
              </button>
            </div>
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
          Cancel
        </button>
        <button
          type="button"
          disabled={isSubmitting || (visibility !== 'private' && !selectedTarget)}
          onclick={handleSave}
          class="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Permissions'}
        </button>
      </div>
    </div>
  </div>
{/if}
