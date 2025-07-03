<script lang="ts">
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import { Check, Clock } from 'lucide-svelte'
  import type { LucideIconComponent } from '@/components/lucide_icon_map'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { FrontendNotificationType } from '@/constants/notifications'

  interface NotificationItem {
    id: string
    type: FrontendNotificationType
    title: string
    message: string
    data?: Record<string, unknown>
    read_at: string | null
    created_at: string
  }

  interface Props {
    notification: NotificationItem
    iconComponent: LucideIconComponent
    timeAgo: string
    onOpen: (notification: NotificationItem) => void
    onMarkRead: (id: string) => Promise<void>
  }

  const { notification, iconComponent: IconComponent, timeAgo, onOpen, onMarkRead }: Props = $props()
  const { t } = useTranslation()
</script>

<Card
  class="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-neo {!notification.read_at ? 'border-l-4 border-l-primary' : 'opacity-75'}"
  onclick={() => { onOpen(notification) }}
  role="button"
  tabindex={0}
  onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') onOpen(notification) }}
>
  <CardContent class="flex items-start gap-4 p-4 pt-4">
    <div class="shrink-0 rounded-md border-2 border-border bg-muted p-2 shadow-neo-sm">
      <IconComponent class="h-5 w-5 text-foreground" />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <h4 class="font-bold text-sm leading-tight {!notification.read_at ? 'text-foreground' : 'text-muted-foreground'}">
          {notification.title}
        </h4>
        {#if !notification.read_at}
          <span class="shrink-0 h-2.5 w-2.5 rounded-full bg-primary border border-border" title={t('notifications.unread', {}, 'Chưa đọc')}></span>
        {/if}
      </div>
      <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
        {notification.message}
      </p>
      <div class="flex items-center gap-3 mt-2">
        <span class="text-xs text-muted-foreground flex items-center gap-1">
          <Clock class="h-3 w-3" />
          {timeAgo}
        </span>
        {#if !notification.read_at}
          <Button
            variant="ghost"
            size="sm"
            class="h-6 px-2 text-xs font-bold"
            onclick={(e: MouseEvent) => {
              e.stopPropagation()
              void onMarkRead(notification.id)
            }}
          >
            <Check class="h-3 w-3 mr-1" />
            {t('notifications.mark_read', {}, 'Đã đọc')}
          </Button>
        {/if}
      </div>
    </div>
  </CardContent>
</Card>
