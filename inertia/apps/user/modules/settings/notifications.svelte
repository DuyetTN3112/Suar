<script lang="ts">
  
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'

  const { t } = $derived(useTranslation())
</script>

<svelte:head>
  <title>{t('settings.notifications_title', {}, 'Notification settings')}</title>
</svelte:head>

<AppLayout title={t('settings.notifications_title', {}, 'Notification settings')}>
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
</AppLayout>
