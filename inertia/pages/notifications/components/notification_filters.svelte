<script lang="ts">
  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Bell, BellOff } from 'lucide-svelte'
  import { useTranslation } from '@/stores/translation.svelte'

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
    {t('notifications.all', {}, 'Tất cả')}
  </Button>
  <Button
    variant={unreadOnly ? 'default' : 'outline'}
    size="sm"
    class="font-bold"
    onclick={() => { onToggleFilter(true) }}
  >
    <BellOff class="h-4 w-4 mr-2" />
    {t('notifications.unread', {}, 'Chưa đọc')}
    {#if unreadCount > 0}
      <Badge variant="secondary" class="ml-1 text-xs">{unreadCount}</Badge>
    {/if}
  </Button>
</div>
