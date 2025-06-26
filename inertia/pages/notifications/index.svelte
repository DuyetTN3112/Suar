<script lang="ts">
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { router } from '@inertiajs/svelte'
  import {
    Bell,
    BellOff,
    Check,
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

  interface NotificationItem {
    id: string
    type: string
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

  function getIcon(type: string) {
    switch (type) {
      case 'task':
      case 'task_assigned':
      case 'task_overdue':
        return Clock
      case 'message':
      case 'conversation':
        return MessageSquare
      case 'warning':
      case 'alert':
        return TriangleAlert
      case 'review':
      case 'rating':
        return Star
      case 'team':
      case 'organization':
        return Users
      case 'document':
      case 'file':
        return FileText
      case 'info':
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

    <!-- Filter bar -->
    <div class="flex gap-2">
      <Button
        variant={!unreadOnly ? 'default' : 'outline'}
        size="sm"
        class="font-bold"
        onclick={() => { toggleFilter(false); }}
      >
        <Bell class="h-4 w-4 mr-2" />
        {t('notifications.all', {}, 'Tất cả')}
      </Button>
      <Button
        variant={unreadOnly ? 'default' : 'outline'}
        size="sm"
        class="font-bold"
        onclick={() => { toggleFilter(true); }}
      >
        <BellOff class="h-4 w-4 mr-2" />
        {t('notifications.unread', {}, 'Chưa đọc')}
        {#if unreadCount > 0}
          <Badge variant="secondary" class="ml-1 text-xs">{unreadCount}</Badge>
        {/if}
      </Button>
    </div>

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
          {@const IconComponent = getIcon(notification.type)}
          <Card
            class="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-neo {!notification.read_at ? 'border-l-4 border-l-primary' : 'opacity-75'}"
            onclick={() => { handleNotificationClick(notification); }}
            role="button"
            tabindex={0}
            onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') handleNotificationClick(notification) }}
          >
            <CardContent class="flex items-start gap-4 p-4 pt-4">
              <!-- Icon -->
              <div class="shrink-0 rounded-md border-2 border-border bg-muted p-2 shadow-neo-sm">
                <IconComponent class="h-5 w-5 text-foreground" />
              </div>

              <!-- Content -->
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
                    {formatTimeAgo(notification.created_at)}
                  </span>
                  {#if !notification.read_at}
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-6 px-2 text-xs font-bold"
                      onclick={(e: MouseEvent) => {
                        e.stopPropagation()
                        void markAsRead(notification.id)
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
        {/each}
      </div>

      {#if hasPreviousPage || hasNextPage}
        <div class="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            class="font-bold"
            disabled={!hasPreviousPage}
            onclick={() => { goToPage(currentPage - 1) }}
          >
            Trang trước
          </Button>
          <span class="text-sm text-muted-foreground">
            Trang {currentPage}{#if paginationMeta} / {paginationMeta.last_page}{/if}
          </span>
          <Button
            variant="outline"
            class="font-bold"
            disabled={!hasNextPage}
            onclick={() => { goToPage(currentPage + 1) }}
          >
            Trang sau
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</AppLayout>
