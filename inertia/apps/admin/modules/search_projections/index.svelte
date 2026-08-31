<script lang="ts">
  import { onMount } from 'svelte'
  import { RefreshCw, RotateCcw, ShieldAlert } from 'lucide-svelte'
  import { createSearchProjectionAdminState } from './state.svelte'
  import type {
    SearchProjectionAdminSnapshot,
    SearchProjectionGenerationView,
    SearchProjectionStatus,
  } from './types'

  interface Props {
    snapshot: SearchProjectionAdminSnapshot
    onRebuild?: (input: { target: string }) => Promise<void>
    onPreview?: (input: { generationId: string; action: 'activate' | 'rollback' }) => Promise<void>
    onApply?: (input: { generationId: string; action: 'activate' | 'rollback'; previewToken: string }) => Promise<void>
    onRollback?: (input: { generationId: string; action: 'rollback' }) => Promise<void>
    onReconcile?: () => Promise<void>
    onAbort?: (input: { generationId: string }) => Promise<void>
  }

  let {
    snapshot: initialSnapshot,
    onRebuild,
    onPreview,
    onApply,
    onRollback,
    onReconcile,
    onAbort,
  }: Props = $props()

  const internalState = createSearchProjectionAdminState()
  let internalSnapshot = $state<SearchProjectionAdminSnapshot | null>(null)
  let snapshot = $derived(internalSnapshot ?? initialSnapshot)

  const internalPreview = async (input: { generationId: string; action: 'activate' | 'rollback' }): Promise<void> => {
    if (input.action !== 'activate') return
    await internalState.previewActivation(input.generationId)
    internalSnapshot = internalState.snapshot
  }

  const internalApply = async (input: { generationId: string; action: 'activate' | 'rollback'; previewToken: string }): Promise<void> => {
    if (input.action !== 'activate') return
    const preview = internalState.snapshot.preview
    if (preview?.expectedLockVersion === undefined || preview.expectedCurrentIndexNames === undefined) return
    await internalState.applyActivation({
      id: input.generationId,
      expectedLockVersion: preview.expectedLockVersion,
      expectedCurrentIndexNames: [...preview.expectedCurrentIndexNames],
      expectedStateToken: input.previewToken,
      now: new Date().toISOString(),
    })
    internalSnapshot = internalState.snapshot
  }

  let previewHandler = $derived(onPreview ?? internalPreview)
  let applyHandler = $derived(onApply ?? internalApply)

  function canPreview(action: 'activate' | 'rollback'): boolean {
    return action === 'activate' ? previewHandler !== undefined : onPreview !== undefined
  }

  onMount(async () => {
    if (onPreview === undefined && onApply === undefined) {
      await internalState.load()
      internalSnapshot = internalState.snapshot
    }
  })

  const statusLabels: Record<SearchProjectionStatus, string> = {
    unknown: 'Inventory only',
    building: 'Building',
    catching_up: 'Catching up',
    validating: 'Validating',
    blocked: 'Blocked',
    ready: 'Ready',
    active: 'Active',
    failed: 'Failed',
  }

  const statusClasses: Record<SearchProjectionStatus, string> = {
    unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-800',
    building: 'border-blue-500/30 bg-blue-500/10 text-blue-800',
    catching_up: 'border-sky-500/30 bg-sky-500/10 text-sky-800',
    validating: 'border-violet-500/30 bg-violet-500/10 text-violet-800',
    blocked: 'border-amber-500/30 bg-amber-500/10 text-amber-900',
    ready: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800',
    active: 'border-primary/30 bg-primary/10 text-primary',
    failed: 'border-red-500/30 bg-red-500/10 text-red-800',
  }

  function statusLabel(status: SearchProjectionStatus): string {
    return statusLabels[status] ?? 'Unknown'
  }

  function lag(generation: SearchProjectionGenerationView): number | null {
    if (generation.documentCount === null || generation.expectedDocumentCount === null) return null
    return Math.max(0, generation.expectedDocumentCount - generation.documentCount)
  }

  function canAbort(status: SearchProjectionStatus): boolean {
    return status === 'building' || status === 'catching_up' || status === 'validating'
  }

  function previewAction(generationId: string, action: 'activate' | 'rollback'): void {
    void previewHandler?.({ generationId, action })
  }

  function applyPreview(): void {
    if (snapshot.preview === null || snapshot.preview.isStale) return
    const input = {
      generationId: snapshot.preview.generationId,
      action: snapshot.preview.kind,
      previewToken: snapshot.preview.previewToken,
    } as const
    if (snapshot.preview.kind === 'rollback') {
      void onRollback?.({ generationId: input.generationId, action: 'rollback' })
    } else {
      void applyHandler?.(input)
    }
  }

  function refreshPreview(): void {
    if (snapshot.preview === null) return
    void previewHandler?.({ generationId: snapshot.preview.generationId, action: snapshot.preview.kind })
  }
</script>

<section class="mx-auto w-full max-w-7xl space-y-6" aria-labelledby="search-projections-title">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Search operations</p>
      <h1 id="search-projections-title" class="text-3xl font-bold tracking-tight text-foreground">
        Search projection generations
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-muted-foreground">
        Review completeness evidence before activating or rolling back a generation.
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:bg-muted/40 disabled:opacity-50"
        disabled={snapshot.loadingAction !== null || onReconcile === undefined}
        onclick={() => void onReconcile?.()}
        aria-label="Reconcile projection state"
      >
        <RefreshCw class="size-4" aria-hidden="true" />
        Reconcile state
      </button>
    </div>
  </div>

  {#if snapshot.error}
    <div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-800">
      {snapshot.error}
    </div>
  {/if}

  <div role="status" aria-live="polite" class="sr-only">
    {snapshot.loadingAction ? `${snapshot.loadingAction} in progress` : 'Projection state loaded'}
  </div>

  {#if snapshot.preview}
    <section class="rounded-2xl border border-border bg-card p-5 shadow-xs" aria-labelledby="projection-preview-title">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="projection-preview-title" class="text-lg font-bold text-foreground">
            {snapshot.preview.kind === 'activate' ? 'Activation preview' : 'Rollback preview'}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Generation {snapshot.preview.generationId} is fenced by a server-issued preview.
          </p>
        </div>
        {#if snapshot.preview.isStale}
          <span class="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-900">
            <ShieldAlert class="size-3.5" aria-hidden="true" />
            Stale preview
          </span>
        {/if}
      </div>
      {#if snapshot.preview.isStale && snapshot.preview.staleReason}
        <p class="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-950">
          {snapshot.preview.staleReason}
        </p>
      {/if}
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border border-border px-3 py-2 text-sm font-bold text-foreground hover:bg-muted/40 disabled:opacity-50"
          disabled={snapshot.loadingAction !== null || !canPreview('activate')}
          onclick={refreshPreview}
        >
          Refresh preview
        </button>
        <button
          type="button"
          class="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={snapshot.preview.isStale || snapshot.loadingAction !== null || (snapshot.preview.kind === 'rollback' ? onRollback === undefined : applyHandler === undefined)}
          onclick={applyPreview}
          aria-label={snapshot.preview.kind === 'activate' ? 'Apply activation preview' : 'Apply rollback preview'}
        >
          Apply {snapshot.preview.kind === 'activate' ? 'activation' : 'rollback'} preview
        </button>
      </div>
    </section>
  {/if}

  <div class="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
    <div role="table" aria-label="Search projection generations" class="min-w-[760px]">
      <div role="row" class="grid grid-cols-[1.2fr_1fr_1fr_1.4fr_1fr] gap-4 border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span role="columnheader">Target / generation</span>
        <span role="columnheader">Status</span>
        <span role="columnheader">Checkpoint</span>
        <span role="columnheader">Completeness</span>
        <span role="columnheader">Fenced actions</span>
      </div>
      {#each snapshot.generations as generation (generation.id)}
        {@const generationLag = lag(generation)}
        <div
          role="row"
          aria-label={`${generation.target} ${statusLabel(generation.status)}`}
          class="grid grid-cols-[1.2fr_1fr_1fr_1.4fr_1fr] gap-4 border-b border-border px-4 py-4 last:border-b-0"
        >
          <div role="cell" class="min-w-0">
            <div class="truncate font-bold text-foreground">{generation.target}</div>
            <div class="truncate text-xs text-muted-foreground">{generation.generation}</div>
            {#if generation.id === snapshot.activeGenerationId}
              <span class="mt-1 inline-block text-xs font-semibold text-primary">Current alias target</span>
            {/if}
          </div>
          <div role="cell">
            <span class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[generation.status] ?? statusClasses.unknown}`}>
              {statusLabel(generation.status)}
            </span>
            {#if generation.blocker}
              <p class="mt-2 text-xs text-muted-foreground">{generation.blocker}</p>
            {/if}
          </div>
          <div role="cell" class="text-sm text-foreground">
            <div>{generation.checkpoint ?? 'Not checkpointed'}</div>
            <div class="mt-1 text-xs text-muted-foreground">{generation.sourceEntityRevision}</div>
          </div>
          <div role="cell" class="text-sm text-foreground">
            {#if generation.documentCount !== null && generation.expectedDocumentCount !== null}
              <div>{generation.documentCount}/{generation.expectedDocumentCount} documents</div>
              {#if generationLag !== null && generationLag > 0}
                <div class="mt-1 text-xs font-semibold text-amber-800">{generationLag} documents behind</div>
              {:else}
                <div class="mt-1 text-xs text-emerald-800">Complete count verified</div>
              {/if}
            {:else}
              <div class="text-muted-foreground">Awaiting completeness evidence</div>
            {/if}
          </div>
          <div role="cell" class="flex flex-wrap content-start gap-2">
            {#if generation.status === 'ready'}
              <button
                type="button"
                class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted/40 disabled:opacity-50"
                disabled={snapshot.loadingAction !== null || !canPreview('activate')}
                onclick={() => previewAction(generation.id, 'activate')}
                aria-label="Preview activation"
              >
                Preview activation
              </button>
            {:else if generation.status === 'active'}
              <button
                type="button"
                class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted/40 disabled:opacity-50"
                disabled={snapshot.loadingAction !== null || onPreview === undefined}
                onclick={() => previewAction(generation.id, 'rollback')}
                aria-label="Preview rollback"
              >
                <RotateCcw class="mr-1 inline size-3.5" aria-hidden="true" />
                Preview rollback
              </button>
            {/if}
            {#if generation.status === 'blocked' || generation.status === 'failed'}
              <button
                type="button"
                class="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted/40 disabled:opacity-50"
                disabled={snapshot.loadingAction !== null || onRebuild === undefined}
                onclick={() => void onRebuild?.({ target: generation.target })}
                aria-label="Rebuild projection"
              >
                Rebuild projection
              </button>
            {/if}
            {#if canAbort(generation.status)}
              <button
                type="button"
                class="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-500/10 disabled:opacity-50"
                disabled={snapshot.loadingAction !== null || onAbort === undefined}
                onclick={() => void onAbort?.({ generationId: generation.id })}
                aria-label="Abort rebuild"
              >
                Abort rebuild
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
