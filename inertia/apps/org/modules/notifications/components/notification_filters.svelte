<script lang="ts">
  import { Bell, BellOff } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    unreadOnly: boolean
    unreadCount: number
    onToggleFilter: (showUnreadOnly: boolean) => void
  }

  const { unreadOnly, unreadCount, onToggleFilter }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="flex gap-2">
  <Button
    variant={!unreadOnly ? 'default' : 'outline'}
    size="sm"
    class="font-bold"
    onclick={() => { onToggleFilter(false) }}
  >
    <Bell class="h-4 w-4 mr-2" />
    {t('notifications.all', {}, 'All')}
  </Button>
  <Button
    variant={unreadOnly ? 'default' : 'outline'}
    size="sm"
    class="font-bold"
    onclick={() => { onToggleFilter(true) }}
  >
    <BellOff class="h-4 w-4 mr-2" />
    {t('notifications.unread', {}, 'Unread')}
    {#if unreadCount > 0}
      <Badge variant="secondary" class="ml-1 text-xs">{unreadCount}</Badge>
    {/if}
  </Button>
</div>
