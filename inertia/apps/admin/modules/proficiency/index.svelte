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
    skills?: {
      id: string
      skillName: string
      skillCode: string
      categoryCode: string
    }[]
  }

  const { scale, skills = [] }: Props = $props()
  const { t } = useTranslation()
</script>

<svelte:head>
  <title>{t('admin_ui.proficiency.index.page_title', {}, 'Proficiency Scale — Admin')}</title>
</svelte:head>

 
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{t('admin_ui.proficiency.index.title', {}, 'Proficiency Scale')}</h1>
        <p class="text-sm text-muted-foreground">{t('admin_ui.proficiency.index.description', {}, 'Active proficiency scale and level definitions')}</p>
      </div>
    </div>

    {#if !scale}
      <Card>
        <CardContent class="py-12 text-center text-muted-foreground">
          {t('admin_ui.proficiency.index.empty', {}, 'No active proficiency scale found.')}
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
              <span class="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-green-600">{t('admin_ui.proficiency.status.active', {}, 'Active')}</span>
            {:else}
              <span class="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">{t('admin_ui.proficiency.status.inactive', {}, 'Inactive')}</span>
            {/if}
            <Link href={`/admin/proficiency/${scale.id}`} class="text-xs underline">{t('admin_ui.proficiency.index.view_details', {}, 'View details')} →</Link>
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

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">{t('admin_ui.proficiency.skill_catalog.title', {}, 'Skill rubric catalog')}</CardTitle>
        <p class="text-sm text-muted-foreground">{t('admin_ui.proficiency.skill_catalog.description', {}, 'Open a skill to manage its rubric versions.')}</p>
      </CardHeader>
      <CardContent>
        {#if skills.length === 0}
          <p class="text-sm text-muted-foreground">{t('admin_ui.proficiency.skill_catalog.empty', {}, 'No active skills found.')}</p>
        {:else}
          <div class="grid gap-2 sm:grid-cols-2">
            {#each skills as skill (skill.id)}
              <Link
                href={`/admin/proficiency/rubrics/${skill.id}`}
                class="rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <span class="block font-semibold text-foreground">{skill.skillName}</span>
                <span class="mt-1 block text-xs text-muted-foreground">
                  {skill.skillCode} · {skill.categoryCode}
                </span>
              </Link>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
 
