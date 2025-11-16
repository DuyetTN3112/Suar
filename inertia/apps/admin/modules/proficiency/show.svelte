<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'

  interface Level {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName: string | null
    normalizedValue: number
    genericDescription: string | null
    sortOrder: number
    expectedKnowledge: string | null
    expectedExecution: string | null
    autonomyDescriptor: string | null
    complexityDescriptor: string | null
    qualityDescriptor: string | null
    collaborationDescriptor: string | null
    observableBehaviors: string[] | null
    positiveExamples: string[] | null
    negativeExamples: string[] | null
    evidenceGuidance: string | null
    ceilingGuidance: string | null
  }

  interface Props {
    scale: {
      id: string
      code: string
      name: string
      version: number
      isActive: boolean
      effectiveFrom: string | null
      effectiveTo: string | null
      levels: Level[]
      createdAt: string
      updatedAt: string
    }
  }

  const { scale }: Props = $props()
</script>

<svelte:head>
  <title>{scale.name} — Admin</title>
</svelte:head>


  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/admin/proficiency" class="underline">Proficiency</Link>
      <span>/</span>
      <span>{scale.name}</span>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">{scale.name}</CardTitle>
        <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span class="rounded-full border px-2 py-0.5">v{scale.version}</span>
          <span class="rounded-full border px-2 py-0.5">{scale.code}</span>
          {#if scale.isActive}
            <span class="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-green-600">Active</span>
          {:else}
            <span class="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">Inactive</span>
          {/if}
        </div>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/50">
                <th class="text-left px-3 py-2 font-medium">Ordinal</th>
                <th class="text-left px-3 py-2 font-medium">Code</th>
                <th class="text-left px-3 py-2 font-medium">Display Name</th>
                <th class="text-left px-3 py-2 font-medium">Short Name</th>
                <th class="text-left px-3 py-2 font-medium">Normalized</th>
                <th class="text-left px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {#each scale.levels as level (level.id)}
                <tr class="border-b last:border-b-0">
                  <td class="px-3 py-2 font-mono text-xs">{level.ordinal}</td>
                  <td class="px-3 py-2">
                    <span class="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{level.code}</span>
                  </td>
                  <td class="px-3 py-2 font-medium">{level.displayName}</td>
                  <td class="px-3 py-2 text-muted-foreground">{level.shortName ?? '—'}</td>
                  <td class="px-3 py-2 font-mono text-xs">{level.normalizedValue}</td>
                  <td class="px-3 py-2 text-muted-foreground text-xs max-w-xs truncate">{level.genericDescription ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4">
      {#each scale.levels as level (level.id)}
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-base">
              <span class="rounded bg-muted px-2 py-0.5 text-xs font-semibold">{level.shortName ?? level.code}</span>
              <span>{level.displayName}</span>
            </CardTitle>
            <p class="text-sm text-muted-foreground">
              {level.genericDescription ?? 'No generic description'}
            </p>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected Knowledge</p>
                <p>{level.expectedKnowledge ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected Execution</p>
                <p>{level.expectedExecution ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Autonomy</p>
                <p>{level.autonomyDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complexity</p>
                <p>{level.complexityDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quality</p>
                <p>{level.qualityDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collaboration</p>
                <p>{level.collaborationDescriptor ?? '—'}</p>
              </div>
            </div>

            {#if level.observableBehaviors?.length}
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observable Behaviors</p>
                <ul class="list-disc pl-5 text-muted-foreground">
                  {#each level.observableBehaviors as behavior}
                    <li>{behavior}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if level.evidenceGuidance}
              <div class="rounded border border-border bg-muted/20 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence Guidance</p>
                <p class="mt-1 text-foreground">{level.evidenceGuidance}</p>
              </div>
            {/if}

            {#if level.ceilingGuidance}
              <div class="rounded border border-border bg-secondary/40 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ceiling Guidance</p>
                <p class="mt-1 text-foreground">{level.ceilingGuidance}</p>
              </div>
            {/if}
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>
