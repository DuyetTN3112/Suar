<script lang="ts">
  import { AlertTriangle, CheckCircle2, GitMerge, LoaderCircle, ShieldCheck } from 'lucide-svelte'

  import AdminPageHeader from '@/apps/admin/shared/components/admin_page_header.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'

  type ChangeKind = 'rename' | 'merge' | 'split'
  type Impact = { assignments: number; savedViews: number; alerts: number; projections: number; indices: number }
  type Plan = { planToken: string; fromVersion: number; toVersion: number; outcome: string; mapping: { disposition: string; reason: string }[]; impact: Impact }
  type Run = { status: string; lockVersion: number }
  type Preview = { plan: Plan; run: Run; impactVisibility: 'aggregate' }

  let namespace = $state('skills')
  let expectedVersion = $state('')
  let kind = $state<ChangeKind>('merge')
  let fromTermId = $state('')
  let toTermId = $state('')
  let replacements = $state('')
  let preview = $state<Preview | null>(null)
  let appliedRun = $state<Run | null>(null)
  let loading = $state(false)
  let errorMessage = $state('')

  async function readJson(response: Response): Promise<Record<string, unknown>> {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) {
      const error = body['error']
      const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : 'Taxonomy governance request failed'
      throw new Error(message)
    }
    return body
  }

  function buildChange() {
    const from = { namespace, termId: fromTermId.trim() }
    if (kind === 'split') return { kind, from, replacements: replacements.split(',').map((termId) => ({ namespace, termId: termId.trim() })).filter(({ termId }) => termId.length > 0) }
    return { kind, from, to: { namespace, termId: toTermId.trim() } }
  }

  async function previewChange() {
    loading = true
    errorMessage = ''
    preview = null
    appliedRun = null
    try {
      const body = await readJson(await fetch('/api/admin/taxonomy/governance/preview', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ namespace: namespace.trim(), expectedVersion: Number(expectedVersion), changes: [buildChange()] }) }))
      preview = body['data'] as Preview
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Taxonomy preview failed'
    } finally {
      loading = false
    }
  }

  async function applyPlan() {
    if (!preview || !canApply) return
    loading = true
    errorMessage = ''
    try {
      const body = await readJson(await fetch(`/api/admin/taxonomy/governance/runs/${preview.plan.planToken}/apply`, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ expectedLockVersion: preview.run.lockVersion, publishedVersion: preview.plan.fromVersion, items: [], limit: 100 }) }))
      appliedRun = (body['data'] as { run: Run }).run
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Taxonomy apply failed'
    } finally {
      loading = false
    }
  }

  const canPreview = $derived(namespace.trim().length > 0 && Number.isSafeInteger(Number(expectedVersion)) && Number(expectedVersion) > 0 && fromTermId.trim().length > 0 && (kind === 'split' ? replacements.trim().length > 0 : toTermId.trim().length > 0))
  const hasConsumerImpact = $derived(preview !== null && Object.values(preview.plan.impact).some((value) => value > 0))
  const canApply = $derived(preview !== null && !hasConsumerImpact && preview.plan.outcome !== 'blocked' && preview.plan.outcome !== 'requires_repair' && appliedRun === null)
</script>

<svelte:head><title>Taxonomy governance — Admin</title></svelte:head>

<div data-testid="taxonomy_governance" class="mx-auto max-w-6xl space-y-6">
  <AdminPageHeader title="Taxonomy governance" description="Preview bounded impact, resolve blockers, and apply an explicitly approved migration checkpoint." />
  <div class="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
    <Card>
      <CardHeader><CardTitle class="flex items-center gap-2"><GitMerge class="size-4" aria-hidden="true" /> Change proposal</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-namespace">Namespace</label><input id="taxonomy-namespace" bind:value={namespace} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
          <div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-version">Expected taxonomy version</label><input id="taxonomy-version" type="number" min="1" bind:value={expectedVersion} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
        </div>
        <div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-kind">Change kind</label><select id="taxonomy-kind" bind:value={kind} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="rename">Rename</option><option value="merge">Merge</option><option value="split">Split</option></select></div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-from">From term ID</label><input id="taxonomy-from" bind:value={fromTermId} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>
          {#if kind === 'split'}<div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-replacements">Replacement term IDs</label><input id="taxonomy-replacements" bind:value={replacements} placeholder="term-a, term-b" class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>{:else}<div><label class="mb-1 block text-xs font-semibold text-muted-foreground" for="taxonomy-to">To term ID</label><input id="taxonomy-to" bind:value={toTermId} class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" /></div>{/if}
        </div>
        <p class="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">The preview is aggregate-only. This screen never displays criteria, assignments, principals, or result snapshots.</p>
        <Button onclick={previewChange} disabled={!canPreview || loading}>{loading ? 'Working…' : 'Preview change'}</Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle class="flex items-center gap-2"><ShieldCheck class="size-4" aria-hidden="true" /> Governed result</CardTitle></CardHeader>
      <CardContent class="space-y-4">
        {#if errorMessage}<div role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</div>
        {:else if !preview}<div class="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Submit a change proposal to see bounded impact and blockers.</div>
        {:else}
          <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome</p><p class="mt-1 text-xl font-bold">{preview.plan.outcome}</p></div><span class="rounded-full border border-border px-2 py-1 font-mono text-xs">v{preview.plan.fromVersion} → v{preview.plan.toVersion}</span></div>
          <div><p class="mb-2 text-sm font-semibold">Aggregate impact</p><div class="grid grid-cols-2 gap-2 sm:grid-cols-5"><span class="rounded-md border border-border p-2 text-xs"><strong class="block text-base">{preview.plan.impact.assignments}</strong>assignments</span><span class="rounded-md border border-border p-2 text-xs"><strong class="block text-base">{preview.plan.impact.savedViews}</strong>saved views</span><span class="rounded-md border border-border p-2 text-xs"><strong class="block text-base">{preview.plan.impact.alerts}</strong>alerts</span><span class="rounded-md border border-border p-2 text-xs"><strong class="block text-base">{preview.plan.impact.projections}</strong>projections</span><span class="rounded-md border border-border p-2 text-xs"><strong class="block text-base">{preview.plan.impact.indices}</strong>indices</span></div></div>
          {#if preview.plan.mapping.some(({ disposition }) => disposition === 'requires_repair' || disposition === 'blocked')}<div class="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800" role="status"><AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div><strong>Blocked or repair-required.</strong> Resolve consumer repair before applying.</div></div>
          {:else if hasConsumerImpact}<div class="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800" role="status"><AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div><strong>Consumer coordination required.</strong> This aggregate preview cannot be applied until a server-owned coordination manifest is available.</div></div>
          {:else}<div class="flex gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800" role="status"><CheckCircle2 class="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div>Plan is eligible for an explicit checkpoint apply.</div></div>{/if}
          <p class="text-xs text-muted-foreground">No private consumer records are shown. Run status: <span class="font-mono">{appliedRun?.status ?? preview.run.status}</span></p>
          <Button onclick={applyPlan} disabled={!canApply || loading}>{#if loading}<LoaderCircle class="mr-2 inline size-4 animate-spin" aria-hidden="true" />{/if}Apply governed plan</Button>
        {/if}
      </CardContent>
    </Card>
  </div>
</div>
