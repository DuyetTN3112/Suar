<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import { SETTINGS_CARDS as settingsCards } from '@/apps/org/shared/constants/settings'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'

  const { t } = $derived(useTranslation())
</script>

<svelte:head>
  <title>{t('settings.index_title', {}, 'Settings')}</title>
</svelte:head>

<OrganizationLayout title={t('settings.index_title', {}, 'Settings')}>
  <div class="container py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 class="text-4xl font-bold tracking-tight">{t('settings.index_title', {}, 'Settings')}</h1>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each settingsCards as item}
          <Link href={item.href} class="border border-border rounded-lg p-5 bg-card text-card-foreground transition-transform hover:-translate-y-0.5">
            <h2 class="text-2xl font-bold">{t(item.titleKey, {}, item.titleFallback)}</h2>
          </Link>
        {/each}
      </div>
    </div>
  </div>
</OrganizationLayout>
