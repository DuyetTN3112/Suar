<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

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
  const { t } = useTranslation()
</script>

<svelte:head>
  <title>{t('admin_ui.proficiency.show.page_title', { name: scale.name }, ':name — Admin')}</title>
</svelte:head>


  <div class="space-y-6">
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/admin/proficiency" class="underline">{t('admin_ui.proficiency.show.breadcrumb', {}, 'Proficiency')}</Link>
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
            <span class="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-green-600">{t('admin_ui.proficiency.status.active', {}, 'Active')}</span>
          {:else}
            <span class="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">{t('admin_ui.proficiency.status.inactive', {}, 'Inactive')}</span>
          {/if}
        </div>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/50">
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.ordinal', {}, 'Ordinal')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.code', {}, 'Code')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.display_name', {}, 'Display Name')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.short_name', {}, 'Short Name')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.normalized', {}, 'Normalized')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('admin_ui.proficiency.columns.description', {}, 'Description')}</th>
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
              {level.genericDescription ?? t('admin_ui.proficiency.show.no_generic_description', {}, 'No generic description')}
            </p>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="grid gap-3 md:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.expected_knowledge', {}, 'Expected Knowledge')}</p>
                <p>{level.expectedKnowledge ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.expected_execution', {}, 'Expected Execution')}</p>
                <p>{level.expectedExecution ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.autonomy', {}, 'Autonomy')}</p>
                <p>{level.autonomyDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.complexity', {}, 'Complexity')}</p>
                <p>{level.complexityDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.quality', {}, 'Quality')}</p>
                <p>{level.qualityDescriptor ?? '—'}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.collaboration', {}, 'Collaboration')}</p>
                <p>{level.collaborationDescriptor ?? '—'}</p>
              </div>
            </div>

            {#if level.observableBehaviors?.length}
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.observable_behaviors', {}, 'Observable Behaviors')}</p>
                <ul class="list-disc pl-5 text-muted-foreground">
                  {#each level.observableBehaviors as behavior}
                    <li>{behavior}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if level.evidenceGuidance}
              <div class="rounded border border-border bg-muted/20 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.evidence_guidance', {}, 'Evidence Guidance')}</p>
                <p class="mt-1 text-foreground">{level.evidenceGuidance}</p>
              </div>
            {/if}

            {#if level.ceilingGuidance}
              <div class="rounded border border-border bg-secondary/40 p-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('admin_ui.proficiency.fields.ceiling_guidance', {}, 'Ceiling Guidance')}</p>
                <p class="mt-1 text-foreground">{level.ceilingGuidance}</p>
              </div>
            {/if}
          </CardContent>
        </Card>
      {/each}
    </div>
  </div>
