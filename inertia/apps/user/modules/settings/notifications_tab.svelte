<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import Checkbox from '@/apps/user/shared/ui/checkbox.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

  import type { NotificationsTabProps } from './types'

  const { form, onSubmit, processing }: NotificationsTabProps = $props()
  const { t } = $derived(useTranslation())
</script>

<Card>
  <CardHeader>
    <CardTitle>{t('settings.notifications_title', {}, 'Notifications')}</CardTitle>
  </CardHeader>
  <CardContent>
    <form onsubmit={onSubmit} class="space-y-4">
      <div class="space-y-2">
        <Label>{t('settings.notification_options', {}, 'Notification options')}</Label>
        <div class="space-y-4">
          <div class="flex items-center space-x-2">
            <Checkbox
              id="email-notifications"
              checked={form.data.emailNotifications}
              onCheckedChange={(checked) =>
                { form.setData('emailNotifications', checked === true); }
              }
            />
            <Label for="email-notifications">{t('settings.email_notifications', {}, 'Email notifications')}</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox
              id="push-notifications"
              checked={form.data.pushNotifications}
              onCheckedChange={(checked) =>
                { form.setData('pushNotifications', checked === true); }
              }
            />
            <Label for="push-notifications">{t('settings.push_notifications', {}, 'Push notifications')}</Label>
          </div>
        </div>
      </div>
      <Button type="submit" disabled={processing}>
        {processing ? t('settings.saving', {}, 'Saving...') : t('settings.save_changes', {}, 'Save changes')}
      </Button>
    </form>
  </CardContent>
</Card>
