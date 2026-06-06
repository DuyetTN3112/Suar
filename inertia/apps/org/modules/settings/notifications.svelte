<script lang="ts">
  
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'

  const { t } = $derived(useTranslation())
</script>

<svelte:head>
  <title>{t('settings.notifications_title', {}, 'Notification settings')}</title>
</svelte:head>

<OrganizationLayout title={t('settings.notifications_title', {}, 'Notification settings')}>
  <div class="container py-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">{t('settings.notifications_title', {}, 'Notification settings')}</h1>
    </div>

    <div class="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.notification_options', {}, 'Notification options')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-center py-12 text-muted-foreground">
            {t('settings.notification_empty', {}, 'No options yet.')}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</OrganizationLayout>
