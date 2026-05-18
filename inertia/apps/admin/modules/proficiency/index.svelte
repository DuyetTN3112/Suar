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

  interface Scale {
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

  interface Props {
    scale: Scale | null
  }

  const { scale }: Props = $props()
</script>

<svelte:head>
  <title>Proficiency Scale — Admin</title>
</svelte:head>

 
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Proficiency Scale</h1>
        <p class="text-sm text-muted-foreground">Active proficiency scale and level definitions</p>
      </div>
    </div>

    {#if !scale}
      <Card>
        <CardContent class="py-12 text-center text-muted-foreground">
          No active proficiency scale found.
        </CardContent>
      </Card>
    {:else}
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
            <Link href={`/admin/proficiency/${scale.id}`} class="text-xs underline">View details →</Link>
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
                    <td class="px-3 py-2 text-muted-foreground text-xs max-w-xs truncate">
                      {level.genericDescription ?? level.expectedExecution ?? '—'}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
 
