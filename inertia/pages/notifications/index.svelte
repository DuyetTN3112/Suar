<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import NotificationFilters from './components/notification_filters.svelte'
  import NotificationCard from './components/notification_card.svelte'
  import NotificationPagination from './components/notification_pagination.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { router } from '@inertiajs/svelte'
  import {
    Bell,
    CheckCheck,
    Clock,
    MessageSquare,
    TriangleAlert,
    Info,
    Star,
    Users,
    FileText,
    Inbox,
  } from 'lucide-svelte'
  import { formatDistanceToNow } from 'date-fns'
  import { vi } from 'date-fns/locale'
  import {
    FRONTEND_NOTIFICATION_TYPES,
    type FrontendNotificationType,
  } from '@/constants/notifications'

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
    notifications:
      | NotificationItem[]
      | {
        data: NotificationItem[]
        meta?: {
          total: number
          per_page: number
          current_page: number
          last_page: number
        }
      }
    unread_count: number
    filters: { page: number; limit: number; unread_only: boolean }
  }

  const { notifications, unread_count, filters }: Props = $props()
  const { t } = useTranslation()

  const initialItems = $derived(Array.isArray(notifications) ? notifications : notifications.data)
  const paginationMeta = $derived(Array.isArray(notifications) ? undefined : notifications.meta)

  let items = $state<NotificationItem[]>([])
  let unreadCount = $state(0)
  let unreadOnly = $state(false)
  let currentPage = $state(1)
  let markingAll = $state(false)

  $effect(() => {
    items = initialItems
    unreadCount = unread_count
    unreadOnly = filters.unread_only
    currentPage = Array.isArray(notifications)
      ? filters.page
      : (notifications.meta?.current_page || filters.page)
  })

  const displayedItems = $derived(
    unreadOnly ? items.filter((n) => !n.read_at) : items
  )

  const hasPreviousPage = $derived(currentPage > 1)
  const hasNextPage = $derived(
    paginationMeta ? currentPage < paginationMeta.last_page : items.length >= filters.limit * currentPage
  )

  function getCsrfToken(): string {
    if (typeof document === 'undefined') return ''
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  function getIcon(type: FrontendNotificationType) {
    switch (type) {
      case FRONTEND_NOTIFICATION_TYPES.TASK:
      case FRONTEND_NOTIFICATION_TYPES.TASK_ASSIGNED:
      case FRONTEND_NOTIFICATION_TYPES.TASK_OVERDUE:
        return Clock
      case FRONTEND_NOTIFICATION_TYPES.MESSAGE:
      case FRONTEND_NOTIFICATION_TYPES.CONVERSATION:
        return MessageSquare
      case FRONTEND_NOTIFICATION_TYPES.WARNING:
      case FRONTEND_NOTIFICATION_TYPES.ALERT:
        return TriangleAlert
      case FRONTEND_NOTIFICATION_TYPES.REVIEW:
      case FRONTEND_NOTIFICATION_TYPES.RATING:
        return Star
      case FRONTEND_NOTIFICATION_TYPES.TEAM:
      case FRONTEND_NOTIFICATION_TYPES.ORGANIZATION:
        return Users
      case FRONTEND_NOTIFICATION_TYPES.DOCUMENT:
      case FRONTEND_NOTIFICATION_TYPES.FILE:
        return FileText
      case FRONTEND_NOTIFICATION_TYPES.INFO:
        return Info
      default:
        return Bell
    }
  }

  function formatTimeAgo(dateString: string): string {
    try {
      if (!dateString) return t('common.unknown_time', {}, 'Không xác định')
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return t('common.invalid_date', {}, 'Ngày không hợp lệ')
      return formatDistanceToNow(date, { addSuffix: true, locale: vi })
    } catch {
      return t('common.unknown_time', {}, 'Không xác định')
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`/notifications/${id}/mark-as-read`, {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      items = items.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
      unreadCount = Math.max(0, unreadCount - 1)
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err)
    }
  }

  async function markAllAsRead() {
    markingAll = true
    try {
      await fetch('/notifications/mark-all-as-read', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      items = items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      unreadCount = 0
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err)
    } finally {
      markingAll = false
    }
  }

  function toggleFilter(showUnreadOnly: boolean) {
    unreadOnly = showUnreadOnly
    router.get('/notifications', {
      page: 1,
      unread_only: showUnreadOnly,
    }, { preserveState: false, preserveScroll: true })
  }

  function goToPage(nextPage: number) {
    router.get('/notifications', {
      page: nextPage,
      unread_only: unreadOnly,
    }, {
      preserveState: false,
      preserveScroll: true,
    })
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read_at) {
      void markAsRead(notification.id)
    }
  }

  const pageTitle = $derived(t('notifications.title', {}, 'Thông báo'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="container max-w-3xl py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-black tracking-tight">{pageTitle}</h1>
        {#if unreadCount > 0}
          <Badge class="border-2 border-border bg-neo-orange text-foreground font-black text-sm px-3 py-1 shadow-neo-sm">
            {unreadCount}
          </Badge>
        {/if}
      </div>

      {#if unreadCount > 0}
        <Button
          variant="outline"
          size="sm"
          class="font-bold"
          disabled={markingAll}
          onclick={() => { void markAllAsRead() }}
        >
          <CheckCheck class="h-4 w-4 mr-2" />
          {t('notifications.mark_all_read', {}, 'Đánh dấu tất cả đã đọc')}
        </Button>
      {/if}
    </div>

    <Separator />

    <NotificationFilters {unreadOnly} {unreadCount} onToggleFilter={toggleFilter} />

    <!-- Notification list -->
    {#if displayedItems.length === 0}
      <!-- Empty state -->
      <Card class="py-16">
        <CardContent class="flex flex-col items-center justify-center text-center pt-6">
          <div class="rounded-full border-2 border-border bg-muted p-6 shadow-neo-sm mb-4">
            <Inbox class="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-bold mb-2">
            {unreadOnly
              ? t('notifications.no_unread', {}, 'Không có thông báo chưa đọc')
              : t('notifications.no_notifications', {}, 'Không có thông báo nào')}
          </h3>
          <p class="text-muted-foreground">
            {t('notifications.empty_hint', {}, 'Các thông báo mới sẽ xuất hiện tại đây')}
          </p>
        </CardContent>
      </Card>
    {:else}
      <div class="space-y-3">
        {#each displayedItems as notification (notification.id)}
          <NotificationCard
            {notification}
            iconComponent={getIcon(notification.type)}
            timeAgo={formatTimeAgo(notification.created_at)}
            onOpen={handleNotificationClick}
            onMarkRead={markAsRead}
          />
        {/each}
      </div>

      <NotificationPagination
        {hasPreviousPage}
        {hasNextPage}
        {currentPage}
        {paginationMeta}
        onPageChange={goToPage}
      />
    {/if}
  </div>
</AppLayout>
