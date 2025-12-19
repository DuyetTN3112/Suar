<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ArrowRight, Inbox, Send } from 'lucide-svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import type { PagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import PendingSprintReviewPackages from './components/pending_sprint_review_packages.svelte'
  import ReverseReviewList, { type ReverseReviewListItem } from './components/reverse_review_list.svelte'

  type HistoryTab = 'received' | 'sent'
  type UserReviewHistoryKind =
    | 'task_received'
    | 'task_sent'
    | 'manager_received'
    | 'manager_sent'
    | 'environment_received'
    | 'environment_sent'

  interface UserReviewHistoryItem {
    id: string
    direction: HistoryTab
    kind: UserReviewHistoryKind
    title: string
    contextLabel: string
    counterpartLabel: string
    status: string
    rating: number | null
    comment: string | null
    submittedAt: string | null
    detailUrl: string
  }

  interface UserReviewHistory {
    received: UserReviewHistoryItem[]
    sent: UserReviewHistoryItem[]
    stats: {
      received: number
      sent: number
    }
  }

  interface Props {
    mode?: 'user_history' | string
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    history?: UserReviewHistory
    reviews?: ReverseReviewListItem[]
    pagination?: PagePagination
    stats?: {
      total: number
      anonymous: number
      byTargetType: Record<string, number>
    }
    scope?: 'me' | 'org' | 'admin'
  }

  const {
    mode = 'legacy',
    history,
    reviews = [],
    pagination,
    stats = { total: 0, anonymous: 0, byTargetType: {} },
    scope = 'me',
  }: Props = $props()
  const { t } = useTranslation()

  let activeTab = $state<HistoryTab>('received')

  const isUserHistory = $derived(mode === 'user_history' && !!history)
  const pageTitle = $derived(
    isUserHistory
      ? t('task.reverse_reviews.history_title', {}, 'Review history')
      : t('task.reverse_reviews.legacy_title', {}, 'Environment review history')
  )
  const activeItems = $derived(
    activeTab === 'received' ? (history?.received ?? []) : (history?.sent ?? [])
  )
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const kindFallbacks: Record<UserReviewHistoryKind, string> = {
    task_received: 'Task review received',
    task_sent: 'Task review sent',
    manager_received: 'Manager review received',
    manager_sent: 'Manager review sent',
    environment_received: 'Environment review received',
    environment_sent: 'Environment review sent',
  }
  const statusFallbacks: Record<string, string> = {
    awaiting_review: 'Awaiting review',
    in_review: 'In review',
    awaiting_response: 'Awaiting response',
    disputed: 'Disputed',
    reported: 'Dispute report sent',
    done: 'Done',
    pending: 'Pending',
    submitted: 'Submitted',
    completed: 'Completed',
  }

  function kindLabel(kind: UserReviewHistoryKind): string {
    return t(`task.reverse_reviews.kind.${kind}`, {}, kindFallbacks[kind])
  }

  function statusLabel(status: string): string {
    return t(`task.reverse_reviews.status.${status}`, {}, statusFallbacks[status] ?? status)
  }

  function dateLabel(value: string | null): string {
    if (!value) return t('task.reverse_reviews.date_unavailable', {}, 'No timestamp yet')
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return parsed.toLocaleString(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  {#if isUserHistory}
    <div class="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
      <section class="space-y-3">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.history_eyebrow', {}, 'Review history')}</p>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div class="min-w-0">
            <h1 class="text-3xl font-black tracking-tight text-foreground">{pageTitle}</h1>
            <p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              {t('task.reverse_reviews.history_subtitle', {}, 'Separate reviews you received while working and reviews you sent for people or environments.')}
            </p>
          </div>
          <div class="grid w-full grid-cols-2 gap-2 lg:w-80">
            <button
              type="button"
              class={`rounded-md border px-3 py-2 text-left transition ${activeTab === 'received' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50'}`}
              onclick={() => (activeTab = 'received')}
            >
              <span class="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                <Inbox class="h-4 w-4" />
                {t('task.reverse_reviews.received_tab', {}, 'Received')}
              </span>
              <span class="mt-1 block text-2xl font-black">{history?.stats.received ?? 0}</span>
            </button>
            <button
              type="button"
              class={`rounded-md border px-3 py-2 text-left transition ${activeTab === 'sent' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50'}`}
              onclick={() => (activeTab = 'sent')}
            >
              <span class="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em]">
                <Send class="h-4 w-4" />
                {t('task.reverse_reviews.sent_tab', {}, 'Sent')}
              </span>
              <span class="mt-1 block text-2xl font-black">{history?.stats.sent ?? 0}</span>
            </button>
          </div>
        </div>
      </section>

      <PendingSprintReviewPackages />

      <section class="overflow-hidden rounded-md border border-border bg-card">
        <div class="border-b border-border px-4 py-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-foreground">
                {activeTab === 'received'
                  ? t('task.reverse_reviews.received_title', {}, 'Reviews received')
                  : t('task.reverse_reviews.sent_title', {}, 'Reviews sent')}
              </h2>
              <p class="mt-1 text-sm text-muted-foreground">
                {activeTab === 'received'
                  ? t('task.reverse_reviews.received_description', {}, 'Task reviews about you plus manager or environment reviews that need your response.')
                  : t('task.reverse_reviews.sent_description', {}, 'Task reviews you sent to others plus manager and environment reviews after sprints.')}
              </p>
            </div>
            <span class="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-foreground">
              {t('task.reverse_reviews.row_count', { count: activeItems.length }, ':count rows')}
            </span>
          </div>
        </div>

        {#if activeItems.length === 0}
          <div class="grid min-h-72 place-items-center border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {activeTab === 'received'
              ? t('task.reverse_reviews.received_empty', {}, 'No reviews received yet.')
              : t('task.reverse_reviews.sent_empty', {}, 'No reviews sent yet.')}
          </div>
        {:else}
          <div class="divide-y divide-border">
            {#each activeItems as item (item.id)}
              <article class="grid gap-3 px-4 py-4 transition hover:bg-muted/30 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-extrabold text-muted-foreground">
                      {kindLabel(item.kind)}
                    </span>
                    <span class="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-extrabold text-foreground">
                      {statusLabel(item.status)}
                    </span>
                    {#if item.rating !== null}
                      <span class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-600">
                        {item.rating}/5
                      </span>
                    {/if}
                  </div>
                  <h3 class="mt-2 break-words text-base font-black text-foreground">{item.title}</h3>
                  {#if item.comment}
                    <p class="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.comment}</p>
                  {/if}
                </div>

                <div class="min-w-0 text-sm text-muted-foreground">
                  <div class="truncate font-bold text-foreground">{item.contextLabel}</div>
                  <div class="mt-1 truncate">{item.counterpartLabel}</div>
                  <div class="mt-1">{dateLabel(item.submittedAt)}</div>
                </div>

                <Link
                  href={item.detailUrl}
                  class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary"
                >
                  {t('task.reverse_reviews.view_detail', {}, 'View detail')}
                  <ArrowRight class="h-4 w-4" />
                </Link>
              </article>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  {:else}
    <div class="space-y-8 p-4 animate-fade-in sm:p-6 lg:p-8">
      <div class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
        <div class="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              {t('task.reverse_reviews.personal_eyebrow', {}, 'Personal listening desk')}
            </div>
            <h1 class="text-3xl font-black tracking-tight text-foreground">{t('task.reverse_reviews.legacy_title', {}, 'Environment review history')}</h1>
            <p class="max-w-3xl text-sm font-light leading-relaxed text-muted-foreground">
              {t('task.reverse_reviews.legacy_subtitle_personal', {}, 'Work environment and assigner reviews sent or received after sprints.')}
            </p>
          </div>

          <div class="grid w-full min-w-[240px] grid-cols-3 gap-2 lg:w-auto">
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.signal_volume', {}, 'Signal volume')}</span>
              <span class="block text-lg font-black text-primary">{stats.total}</span>
              <span class="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.reverse_reviews.total_feedback', {}, 'Total feedback')}</span>
            </div>
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.trust_shield', {}, 'Trust shield')}</span>
              <span class="block text-lg font-black text-primary">{stats.anonymous}</span>
              <span class="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.reverse_reviews.anonymous', {}, 'Anonymous')}</span>
            </div>
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.target_spread', {}, 'Target spread')}</span>
              <span class="block text-lg font-black text-primary">{Object.keys(stats.byTargetType).length}</span>
              <span class="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{t('task.reverse_reviews.targets', {}, 'Targets')}</span>
            </div>
          </div>
        </div>
      </div>

      <PendingSprintReviewPackages />

      {#if pagination}
        <ReverseReviewList
          {reviews}
          {pagination}
          {stats}
          baseUrl={scope === 'org' ? '/org/reverse-reviews' : '/reviews/reverse-reviews'}
          {scope}
        />
      {/if}
    </div>
  {/if}
</AppLayout>
