<script lang="ts">
  import { Bookmark, Check, ChevronDown, Plus, Pin, Share2, Wrench, Trash2, Copy, Star, X, Bell } from 'lucide-svelte'
  import FilterAlertStatusBadge from '../alerts/filter_alert_status_badge.svelte'
  import FilterAlertSubscriptionDialog from '../alerts/filter_alert_subscription_dialog.svelte'
  import { createFilterAlertState } from '../../alerts/filter_alert_state.svelte'
  import type { FilterCriteria, FilterPresentationState } from '../../contracts'
  import type {
    FilterSavedViewDto,
    SavedViewGrant,
    SavedViewShareScope,
    SavedViewShareTarget,
    SavedViewVisibility,
  } from '../../saved_views/filter_saved_view_client'
  import { createSavedViewState } from '../../saved_views/filter_saved_view_state.svelte'
  import SavedViewShareDialog from './saved_view_share_dialog.svelte'
  import SavedViewRepairDialog from './saved_view_repair_dialog.svelte'

  interface Props {
    contextKey: string
    contextOwner?: string
    currentCriteria: FilterCriteria
    currentPresentation?: FilterPresentationState
    onApplyView: (criteria: FilterCriteria, presentation: FilterPresentationState) => void
    capabilities?: {
      sharedViews?: boolean
      alerts?: boolean
    }
    shareTargets?: readonly SavedViewShareTarget[]
    savedViewState?: ReturnType<typeof createSavedViewState>
    alertState?: ReturnType<typeof createFilterAlertState>
  }

  let {
    contextKey,
    contextOwner = 'system',
    currentCriteria,
    currentPresentation = {},
    onApplyView,
    capabilities = {},
    shareTargets = [],
    savedViewState = createSavedViewState(),
    alertState = createFilterAlertState(),
  }: Props = $props()

  let dropdownOpen = $state(false)
  let saveDialogOpen = $state(false)
  let newViewName = $state('')
  let newViewDescription = $state('')
  let isSavingNew = $state(false)
  let alertDialogOpen = $state(false)
  const supportsSharedViews = $derived(capabilities.sharedViews !== false)
  const supportsAlerts = $derived(capabilities.alerts !== false)
  const activeAlertStatus = $derived(
    savedViewState.activeView
      ? alertState.subscribed === false
        ? 'disabled'
        : alertState.alert?.status ?? savedViewState.activeView.alertStatus
      : 'disabled'
  )

  $effect(() => {
    if (contextKey) {
      void savedViewState.loadViews(contextKey)
    }
  })

  $effect(() => {
    const view = savedViewState.activeView
    if (!view) {
      alertState.reset()
    } else if (view.alertStatus === 'disabled') {
      alertState.setView(view.id)
    } else {
      void alertState.load(view.id)
    }
  })

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen
  }

  function handleSelect(view: FilterSavedViewDto) {
    dropdownOpen = false
    void savedViewState.selectView(view.id, onApplyView)
  }

  async function handleSaveNewView() {
    if (!newViewName.trim()) return
    isSavingNew = true
    try {
      await savedViewState.createView({
        name: newViewName.trim(),
        description: newViewDescription.trim() || null,
        criteria: currentCriteria,
        presentation: currentPresentation,
        contextOwner,
      })
      saveDialogOpen = false
      newViewName = ''
      newViewDescription = ''
    } finally {
      isSavingNew = false
    }
  }

  async function handleSaveCurrentCriteria() {
    if (!savedViewState.activeView) return
    await savedViewState.updateViewCriteria(
      savedViewState.activeView.id,
      currentCriteria,
      currentPresentation
    )
  }

  function handleOpenShare(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    savedViewState.sharingView = view
    dropdownOpen = false
  }

  function handleOpenRepair(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    savedViewState.repairNeededView = view
    dropdownOpen = false
  }

  async function handleDuplicate(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    await savedViewState.duplicateView(view.id, `${view.name} (Copy)`)
  }

  async function handleTogglePin(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    await savedViewState.togglePin(view.id)
  }

  async function handleToggleDefault(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    await savedViewState.toggleDefault(view.id)
  }

  async function handleDelete(view: FilterSavedViewDto, event: Event) {
    event.stopPropagation()
    await savedViewState.deleteView(view.id)
  }

  function openAlertDialog() {
    const view = savedViewState.activeView
    if (!view) return
    if (alertState.viewId !== view.id) alertState.setView(view.id)
    alertDialogOpen = true
    if (view.alertStatus !== 'disabled' && !alertState.alert) void alertState.load(view.id)
  }

  function handleAlertCreate(input: { intervalMinutes: number; timezone: string }) {
    return alertState.create(input)
  }

  function handleAlertSchedule(input: { intervalMinutes: number; timezone: string }) {
    return alertState.schedule(input)
  }

  async function handleShare(
    id: string,
    grants: SavedViewGrant[],
    visibility: SavedViewVisibility,
    scope: SavedViewShareScope
  ): Promise<void> {
    await savedViewState.shareView(id, grants, visibility, scope)
  }

  async function handleRepair(id: string, criteria: FilterCriteria): Promise<void> {
    const repaired = await savedViewState.repairView(id, criteria)
    if (!repaired) return
    savedViewState.selectView(repaired.id, onApplyView)
    await alertState.load(repaired.id)
  }

  async function handleResumeRepairedAlert(): Promise<void> {
    await alertState.resume()
    await savedViewState.loadViews(contextKey)
  }
</script>

<div class="relative inline-block text-left">
  <div class="flex items-center gap-1">
    <button
      type="button"
      onclick={toggleDropdown}
      class="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground shadow-suar-xs transition hover:border-foreground/50"
      aria-expanded={dropdownOpen}
      aria-label="Saved views menu"
    >
      <Bookmark class="size-4 text-muted-foreground" />
      <span>{savedViewState.activeView ? savedViewState.activeView.name : 'Saved Views'}</span>
      {#if savedViewState.activeView?.isDefault}
        <Star class="size-3 fill-amber-400 text-amber-400" />
      {/if}
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>

    {#if savedViewState.activeView}
      {#if savedViewState.activeView.canEdit}
      <button
        type="button"
        onclick={handleSaveCurrentCriteria}
        class="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
        title="Update saved view with current filter criteria"
      >
        Update View
      </button>
      {/if}
      {#if supportsAlerts}
        <FilterAlertStatusBadge
          status={activeAlertStatus}
          reason={savedViewState.activeView.alertReason}
        />
        <button
          type="button"
          onclick={openAlertDialog}
          class="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground"
          aria-label={activeAlertStatus === 'disabled' ? 'Subscribe to alerts' : 'Manage alerts'}
        >
          <Bell class="size-4" aria-hidden="true" />
        </button>
      {/if}
    {/if}
  </div>

  {#if dropdownOpen}
    <div
      class="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-2xl border border-border bg-background p-2 shadow-xl focus:outline-none"
      role="menu"
    >
      <div class="mb-2 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        Saved Views ({savedViewState.views.length})
      </div>

      <div class="max-h-64 overflow-y-auto space-y-1">
        {#if savedViewState.views.length === 0}
          <div class="px-3 py-4 text-center text-xs text-muted-foreground">
            No saved views yet for this context.
          </div>
        {:else}
          {#each savedViewState.views as view (view.id)}
            <div
              role="menuitem"
              tabindex="0"
              onclick={() => handleSelect(view)}
              onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect(view) }}
              class={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                savedViewState.activeViewId === view.id
                  ? 'bg-foreground text-background font-bold'
                  : 'text-foreground hover:bg-muted/40'
              }`}
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                {#if savedViewState.activeViewId === view.id}
                  <Check class="size-3.5 shrink-0" />
                {/if}
                <span class="truncate font-semibold">{view.name}</span>
                {#if view.isDefault}
                  <Star class="size-3 shrink-0 fill-amber-400 text-amber-400" />
                {/if}
                {#if view.migrationState === 'requires_repair' || view.migrationState === 'blocked'}
                  <button
                    type="button"
                    onclick={(e) => handleOpenRepair(view, e)}
                    class="rounded p-0.5 text-amber-500 hover:bg-amber-100"
                    title="Repair required"
                  >
                    <Wrench class="size-3.5" />
                  </button>
                {/if}
              </div>

              <div class="flex items-center gap-1 shrink-0 opacity-80 hover:opacity-100">
                {#if view.canEdit}
                <button
                  type="button"
                  onclick={(e) => handleTogglePin(view, e)}
                  class={`p-1 rounded hover:bg-muted/50 ${view.isPinned ? 'text-primary' : 'text-muted-foreground'}`}
                  title={view.isPinned ? 'Unpin view' : 'Pin view'}
                >
                  <Pin class="size-3" />
                </button>
                <button
                  type="button"
                  onclick={(e) => handleToggleDefault(view, e)}
                  class={`p-1 rounded hover:bg-muted/50 ${view.isDefault ? 'text-amber-500' : 'text-muted-foreground'}`}
                  title={view.isDefault ? 'Remove default' : 'Set as default view'}
                >
                  <Star class="size-3" />
                </button>
                {/if}
                {#if supportsSharedViews && view.canShare}
                  <button
                    type="button"
                    onclick={(e) => handleOpenShare(view, e)}
                    class="p-1 rounded text-muted-foreground hover:bg-muted/50"
                    title="Share permissions"
                  >
                    <Share2 class="size-3" />
                  </button>
                {/if}
                <button
                  type="button"
                  onclick={(e) => handleDuplicate(view, e)}
                  class="p-1 rounded text-muted-foreground hover:bg-muted/50"
                  title="Duplicate view"
                >
                  <Copy class="size-3" />
                </button>
                {#if view.canEdit}
                  <button
                    type="button"
                    onclick={(e) => handleDelete(view, e)}
                    class="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-muted/50"
                    title="Delete view"
                  >
                    <Trash2 class="size-3" />
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="mt-2 border-t border-border pt-2">
        <button
          type="button"
          onclick={() => { saveDialogOpen = true; dropdownOpen = false }}
          class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted/30"
        >
          <Plus class="size-4" />
          <span>Save Current View</span>
        </button>
      </div>
    </div>
  {/if}
</div>

{#if saveDialogOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div class="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
      <div class="flex items-center justify-between pb-4 border-b border-border">
        <h3 class="text-lg font-black text-foreground">Save View</h3>
        <button type="button" onclick={() => { saveDialogOpen = false }} class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X class="size-5" />
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1" for="new-view-name">
            View Name *
          </label>
          <input
            id="new-view-name"
            type="text"
            bind:value={newViewName}
            placeholder="e.g. High Priority Open Tasks"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1" for="new-view-desc">
            Description
          </label>
          <textarea
            id="new-view-desc"
            bind:value={newViewDescription}
            placeholder="Optional description of this saved view"
            rows="2"
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          ></textarea>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2 pt-4 border-t border-border">
        <button
          type="button"
          onclick={() => { saveDialogOpen = false }}
          class="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!newViewName.trim() || isSavingNew}
          onclick={handleSaveNewView}
          class="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {isSavingNew ? 'Saving...' : 'Save View'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if savedViewState.activeView}
  <FilterAlertSubscriptionDialog
    open={alertDialogOpen}
    alert={alertState.alert}
    loading={alertState.loading}
    error={alertState.error}
    onClose={() => { alertDialogOpen = false }}
    onCreate={handleAlertCreate}
    onPause={() => alertState.pause()}
    onResume={() => alertState.resume()}
    onSchedule={handleAlertSchedule}
    onDelete={() => alertState.remove()}
  />
{/if}

{#if savedViewState.sharingView}
  <SavedViewShareDialog
    view={savedViewState.sharingView}
    open={true}
    onClose={() => { savedViewState.sharingView = null }}
    onShare={handleShare}
    targets={shareTargets}
    conflict={savedViewState.shareConflict}
    onReloadConflict={async () => { await savedViewState.reloadShareConflict() }}
    onReapplyConflict={async () => { await savedViewState.reapplyShareConflict() }}
  />
{/if}

{#if savedViewState.repairNeededView}
  <SavedViewRepairDialog
    view={savedViewState.repairNeededView}
    open={true}
    onClose={() => { savedViewState.repairNeededView = null }}
    onRepair={handleRepair}
    onResumeAlert={handleResumeRepairedAlert}
  />
{/if}
