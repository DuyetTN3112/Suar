<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { formatDistanceToNow } from 'date-fns'
  import {
    Bell,
    CheckCheck,
    Clock,
    TriangleAlert,
    Info,
    Star,
    Users,
    FileText,
    Inbox,
  } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import Separator from '@/apps/org/shared/ui/separator.svelte'
  import {
    FRONTEND_NOTIFICATION_TYPES,
  } from '@/apps/org/modules/notifications/constants/notifications'
  import { dateFnsLocale } from '@/apps/org/shared/lib/date_locale'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import {
    notificationPageInboxUrl,
    resolveNotificationPageDeepLink,
    type NotificationPageShell,
  } from '@/apps/shared/notifications/notification_page_links'

  import NotificationCard from './components/notification_card.svelte'
  import NotificationFilters from './components/notification_filters.svelte'
  import NotificationPagination from './components/notification_pagination.svelte'
  import { executeNotificationMutation } from '@/apps/shared/notifications/notification_mutation_http'




  interface NotificationItem {
    id: string
    type: string
    title: string
    message: string
    related_entity_type: string | null
    related_entity_id: string | null
    data?: Record<string, unknown>
    read_at: string | null
    created_at: string
  }

  interface Props {
    shellMode?: NotificationPageShell
    auth?: { user?: { current_organization_role?: string | null } }
    notifications: NotificationItem[]
    pagination: CursorPagePagination
    unread_count: number
    filters: { page: number; limit: number; after?: string | null; before?: string | null; unread_only: boolean }
  }

  const { notifications, pagination, unread_count: initialUnreadCount, filters, shellMode = 'organization' }: Props = $props()
  
  const { locale, t } = $derived(useTranslation())
  const inboxUrl = $derived(notificationPageInboxUrl(shellMode))

  const initialItems = $derived(notifications)

  let items = $state<NotificationItem[]>([])
  let unreadCount = $state(0)
  let unreadOnly = $state(false)
  let markingAll = $state(false)
  let mutationError = $state<string | null>(null)
  let pendingMutations = $state<Set<string>>(new Set())

  $effect(() => {
    items = initialItems
    unreadCount = initialUnreadCount
    unreadOnly = filters.unread_only
  })

  const displayedItems = $derived(
    unreadOnly ? items.filter((n) => !n.read_at) : items
  )

  function getCsrfToken(): string {
    if (typeof document === 'undefined') return ''
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
  }

  function mutationHeaders() {
    return {
      'X-CSRF-TOKEN': getCsrfToken(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  function beginItemMutation(key: string): boolean {
    if (markingAll || pendingMutations.has(key)) return false
    mutationError = null
    pendingMutations = new Set(pendingMutations).add(key)
    return true
  }

  function finishItemMutation(key: string): void {
    const next = new Set(pendingMutations)
    next.delete(key)
    pendingMutations = next
  }

  function reportMutationError(error: unknown): void {
    mutationError = t(
      'notifications.mutation_error',
      {},
      'Unable to update notifications. Please try again.'
    )
    console.error('Notification mutation failed:', error)
  }

  function getIcon(type: string) {
    switch (type) {
      case FRONTEND_NOTIFICATION_TYPES.TASK:
      case FRONTEND_NOTIFICATION_TYPES.TASK_ASSIGNED:
      case FRONTEND_NOTIFICATION_TYPES.TASK_OVERDUE:
      case FRONTEND_NOTIFICATION_TYPES.TASK_APPLICATION:
      case FRONTEND_NOTIFICATION_TYPES.TASK_APPLICATION_REVIEW:
        return Clock
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
      case FRONTEND_NOTIFICATION_TYPES.DEFAULT:
        return Bell
    }
    return Bell
  }

  function formatTimeAgo(dateString: string): string {
    try {
      if (!dateString) return t('common.unknown_time', {}, 'Unknown time')
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return t('common.invalid_date', {}, 'Invalid date')
      return formatDistanceToNow(date, { addSuffix: true, locale: dateFnsLocale(locale) })
    } catch {
      return t('common.unknown_time', {}, 'Unknown time')
    }
  }

  async function markAsRead(id: string) {
    const mutationKey = `mark-read:${id}`
    if (!beginItemMutation(mutationKey)) return
    try {
      await executeNotificationMutation(`/notifications/${encodeURIComponent(id)}/mark-as-read`, {
        method: 'POST',
        headers: mutationHeaders(),
      })

      const current = items.find((notification) => notification.id === id)
      if (current && !current.read_at) {
        items = items.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
        unreadCount = Math.max(0, unreadCount - 1)
      }
    } catch (err) {
      reportMutationError(err)
    } finally {
      finishItemMutation(mutationKey)
    }
  }

  async function deleteNotification(notification: NotificationItem) {
    const mutationKey = `delete:${notification.id}`
    if (!beginItemMutation(mutationKey)) return
    try {
      await executeNotificationMutation(`/notifications/${encodeURIComponent(notification.id)}`, {
        method: 'DELETE',
        headers: mutationHeaders(),
      })

      const current = items.find((item) => item.id === notification.id)
      items = items.filter((item) => item.id !== notification.id)
      if (current && !current.read_at) {
        unreadCount = Math.max(0, unreadCount - 1)
      }
    } catch (err) {
      reportMutationError(err)
    } finally {
      finishItemMutation(mutationKey)
    }
  }

  async function markAllAsRead() {
    if (markingAll || pendingMutations.size > 0) return
    markingAll = true
    mutationError = null
    try {
      await executeNotificationMutation('/notifications/mark-all-as-read', {
        method: 'POST',
        headers: mutationHeaders(),
      })

      items = items.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      unreadCount = 0
    } catch (err) {
      reportMutationError(err)
    } finally {
      markingAll = false
    }
  }

  function toggleFilter(showUnreadOnly: boolean) {
    unreadOnly = showUnreadOnly
    router.get(inboxUrl, {
      unread_only: showUnreadOnly,
    }, { preserveState: false, preserveScroll: true })
  }

  function goToNewer() {
    if (!pagination.cursor?.previousCursor) return
    router.get(inboxUrl, {
      before: pagination.cursor.previousCursor,
      unread_only: unreadOnly,
    }, {
      preserveState: false,
      preserveScroll: true,
    })
  }

  function goToOlder() {
    if (!pagination.cursor?.nextCursor) return
    router.get(inboxUrl, {
      after: pagination.cursor.nextCursor,
      unread_only: unreadOnly,
    }, {
      preserveState: false,
      preserveScroll: true,
    })
  }

  function goToNewest() {
    router.get(inboxUrl, {
      unread_only: unreadOnly,
    }, {
      preserveState: false,
      preserveScroll: true,
    })
  }

  function getNotificationUrl(notification: NotificationItem): string | null {
    return resolveNotificationPageDeepLink(notification, shellMode).url
  }

  function handleNotificationClick(notification: NotificationItem) {
    if (!notification.read_at) {
      void markAsRead(notification.id)
    }
    const url = getNotificationUrl(notification)
    if (url) {
      router.visit(url)
    }
  }

  const pageTitle = $derived(t('notifications.title', {}, 'Notifications'))
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="container max-w-3xl py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-black tracking-tight">{pageTitle}</h1>
        {#if unreadCount > 0}
          <Badge class="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-sm font-medium text-amber-700 dark:text-amber-300">
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
          {t('notifications.mark_all_read', {}, 'Mark all as read')}
        </Button>
      {/if}
    </div>

    <Separator />

    {#if mutationError}
      <p
        role="alert"
        class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
      >
        {mutationError}
      </p>
    {/if}

    <NotificationFilters {unreadOnly} {unreadCount} onToggleFilter={toggleFilter} />

    <!-- Notification list -->
    {#if displayedItems.length === 0}
      <!-- Empty state -->
      <Card class="py-16">
        <CardContent class="flex flex-col items-center justify-center text-center pt-6">
          <div class="rounded-full border-2 border-border bg-muted p-6 shadow-xs mb-4">
            <Inbox class="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 class="text-xl font-bold mb-2">
            {unreadOnly
              ? t('notifications.no_unread', {}, 'No unread notifications')
              : t('notifications.no_notifications', {}, 'No notifications')}
          </h3>
          <p class="text-muted-foreground">
            {t('notifications.empty_hint', {}, 'New notifications will appear here.')}
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
            onDelete={deleteNotification}
          />
        {/each}
      </div>

      <NotificationPagination
        {pagination}
        onLoadNewer={goToNewer}
        onLoadNewest={goToNewest}
        onLoadOlder={goToOlder}
      />
    {/if}
  </div>
</OrganizationLayout>
