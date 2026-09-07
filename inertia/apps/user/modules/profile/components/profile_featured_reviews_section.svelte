<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ArrowRight } from 'lucide-svelte'

  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/user/shared/lib/pagination'
  import {
    findFrontendCanonicalProficiencyLevelOption,
    getFrontendCanonicalProficiencyLevelLabel,
  } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type {
    UserReviewHistory,
    UserReviewHistoryItem,
    UserReviewHistoryKind,
  } from '../types.svelte'

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    verified_public_proficiency_code: string
    avg_percentage: number
    total_reviews: number
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface Props {
    featuredReviews: FeaturedReview[]
    reviewedSkillsCount: number
    reviewHistory?: UserReviewHistory | null
  }

  const { featuredReviews, reviewedSkillsCount, reviewHistory = null }: Props = $props()
  const { t } = useTranslation()

  type SortMode = 'stars' | 'task' | 'skill'
  type ReviewLane = 'received' | 'sent'
  type HistorySortMode = 'recent' | 'score-desc' | 'score-asc' | 'kind'
  type HistoryFilter = 'all' | UserReviewHistoryKind

  let sortMode = $state<SortMode>('stars')
  let receivedFilter = $state<HistoryFilter>('all')
  let sentFilter = $state<HistoryFilter>('all')
  let receivedSort = $state<HistorySortMode>('recent')
  let sentSort = $state<HistorySortMode>('recent')
  let receivedPage = $state(1)
  let sentPage = $state(1)
  const reviewItemsPerPage = 2

  const hasReviewHistory = $derived(!!reviewHistory)
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const sortedReviews = $derived.by(() => {
    const items = [...featuredReviews]
    if (sortMode === 'stars') {
      items.sort((a, b) => b.stars - a.stars)
    } else if (sortMode === 'task') {
      items.sort((a, b) => a.task_name.localeCompare(b.task_name))
    } else {
      items.sort((a, b) => a.skill_name.localeCompare(b.skill_name))
    }
    return items
  })

  function levelLabel(levelCode: string): string {
    return getFrontendCanonicalProficiencyLevelLabel(levelCode, levelCode)
  }

  function levelBadgeClass(levelCode: string): string {
    const order = findFrontendCanonicalProficiencyLevelOption(levelCode)?.order ?? 0
    if (order >= 10) return 'border-border bg-accent text-foreground'
    if (order >= 6) return 'border-border bg-background text-foreground'
    return 'border-border bg-muted text-muted-foreground'
  }

  function kindLabel(kind: UserReviewHistoryKind): string {
    const fallbacks: Record<UserReviewHistoryKind, string> = {
      task_received: 'Task',
      task_sent: 'Task',
      manager_received: 'Manager',
      manager_sent: 'Manager',
      environment_received: 'Environment',
      environment_sent: 'Environment',
    }

    return t(`user.profile_reviews.kind.${kind}`, {}, fallbacks[kind])
  }

  function statusLabel(status: string): string {
    const fallbacks: Record<string, string> = {
      awaiting_review: 'Awaiting review',
      in_review: 'In review',
      awaiting_response: 'Awaiting response',
      disputed: 'Disputed',
      reported: 'Reported',
      ai_reviewing: 'AI reviewing',
      admin_reviewing: 'Admin reviewing',
      resolved: 'Resolved — awaiting final completion',
      done: 'Done',
      pending: 'Pending',
      submitted: 'Submitted',
      completed: 'Completed',
    }

    return t(`user.profile_reviews.status.${status}`, {}, fallbacks[status] ?? status)
  }

  function dateValue(item: UserReviewHistoryItem): number {
    if (!item.submittedAt) return 0
    const parsed = new Date(item.submittedAt).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }

  function dateLabel(value: string | null): string {
    if (!value) return t('user.profile_reviews.date_unavailable', {}, 'No timestamp yet')
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
    }).format(parsed)
  }

  function kindOrder(kind: UserReviewHistoryKind): number {
    const order: Record<UserReviewHistoryKind, number> = {
      task_received: 1,
      manager_received: 2,
      environment_received: 3,
      task_sent: 1,
      manager_sent: 2,
      environment_sent: 3,
    }

    return order[kind]
  }

  function ratingValue(item: UserReviewHistoryItem, emptyValue: number): number {
    return typeof item.rating === 'number' ? item.rating : emptyValue
  }

  function filterItems(items: UserReviewHistoryItem[], filter: HistoryFilter): UserReviewHistoryItem[] {
    if (filter === 'all') return items
    return items.filter((item) => item.kind === filter)
  }

  function sortItems(items: UserReviewHistoryItem[], mode: HistorySortMode): UserReviewHistoryItem[] {
    return [...items].sort((left, right) => {
      if (mode === 'score-desc') {
        return ratingValue(right, -1) - ratingValue(left, -1)
      }
      if (mode === 'score-asc') {
        return ratingValue(left, Number.POSITIVE_INFINITY) - ratingValue(right, Number.POSITIVE_INFINITY)
      }
      if (mode === 'kind') {
        return kindOrder(left.kind) - kindOrder(right.kind) || left.title.localeCompare(right.title)
      }

      return dateValue(right) - dateValue(left)
    })
  }

  function laneItems(lane: ReviewLane): UserReviewHistoryItem[] {
    const source = lane === 'received' ? (reviewHistory?.received ?? []) : (reviewHistory?.sent ?? [])
    const filter = lane === 'received' ? receivedFilter : sentFilter
    const sort = lane === 'received' ? receivedSort : sentSort

    return sortItems(filterItems(source, filter), sort)
  }

  function setLaneFilter(lane: ReviewLane, value: HistoryFilter) {
    if (lane === 'received') {
      receivedFilter = value
      receivedPage = 1
    } else {
      sentFilter = value
      sentPage = 1
    }
  }

  function setLaneSort(lane: ReviewLane, value: HistorySortMode) {
    if (lane === 'received') {
      receivedSort = value
      receivedPage = 1
    } else {
      sentSort = value
      sentPage = 1
    }
  }

  function lanePage(lane: ReviewLane): number {
    return lane === 'received' ? receivedPage : sentPage
  }

  function lanePagination(lane: ReviewLane) {
    return buildOffsetPagination({
      total: laneItems(lane).length,
      perPage: reviewItemsPerPage,
      page: lanePage(lane),
    })
  }

  function paginatedLaneItems(lane: ReviewLane): UserReviewHistoryItem[] {
    return paginateOffsetItems(laneItems(lane), lanePagination(lane))
  }

  function setLanePage(lane: ReviewLane, page: number) {
    if (lane === 'received') {
      receivedPage = page
    } else {
      sentPage = page
    }
  }

  function laneDirectionLabel(lane: ReviewLane): string {
    return lane === 'received'
      ? t('user.profile_reviews.direction_received', {}, 'Received')
      : t('user.profile_reviews.direction_sent', {}, 'Authored')
  }

  function starsAriaLabel(stars: number): string {
    return t('user.profile_reviews.stars_aria', { count: stars }, `${stars} stars`)
  }
</script>

<section class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.profile_reviews.eyebrow', {}, 'Evidence reviews')}
      </p>
      <h2 class="mt-1 text-2xl font-black tracking-tight text-foreground">
        {t('user.profile_reviews.title', {}, 'Two-way reviews')}
      </h2>
      <p class="text-xs text-muted-foreground">
        {t('user.profile_reviews.reviewed_count', { count: reviewedSkillsCount }, `${reviewedSkillsCount} reviewed skills`)}
      </p>
    </div>

    {#if !hasReviewHistory && featuredReviews.length > 1}
      <div class="flex gap-1 rounded-lg border border-border bg-background p-0.5">
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'stars' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'stars'}
        >{t('user.profile_reviews.sort_button_stars', {}, 'Stars')}</button>
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'task' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'task'}
        >{t('user.profile_reviews.sort_button_task', {}, 'Task')}</button>
        <button
          class="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide {sortMode === 'skill' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
          onclick={() => sortMode = 'skill'}
        >{t('user.profile_reviews.sort_button_skill', {}, 'Skill')}</button>
      </div>
    {/if}
  </div>

  {#if hasReviewHistory}
    <div class="grid gap-3 lg:grid-cols-2 lg:items-stretch">
      {#each [
        {
          lane: 'received' as const,
          eyebrow: t('user.profile_reviews.received_eyebrow', {}, 'Received'),
          title: t('user.profile_reviews.received_title', {}, 'Reviews received'),
          count: laneItems('received').length,
          filter: receivedFilter,
          sort: receivedSort,
          filters: [
            ['all', t('user.profile_reviews.filter_all', {}, 'All')],
            ['task_received', kindLabel('task_received')],
            ['manager_received', kindLabel('manager_received')],
            ['environment_received', kindLabel('environment_received')],
          ] as const,
        },
        {
          lane: 'sent' as const,
          eyebrow: t('user.profile_reviews.sent_eyebrow', {}, 'Authored'),
          title: t('user.profile_reviews.sent_title', {}, 'Reviews authored'),
          count: laneItems('sent').length,
          filter: sentFilter,
          sort: sentSort,
          filters: [
            ['all', t('user.profile_reviews.filter_all', {}, 'All')],
            ['task_sent', kindLabel('task_sent')],
            ['manager_sent', kindLabel('manager_sent')],
            ['environment_sent', kindLabel('environment_sent')],
          ] as const,
        },
      ] as laneConfig (laneConfig.lane)}
        <section
          class={`flex h-full flex-col rounded-xl border border-border p-4 ${laneConfig.lane === 'sent' ? 'bg-primary/5' : 'bg-card'}`}
          aria-labelledby={`profile-${laneConfig.lane}-reviews-title`}
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{laneConfig.eyebrow}</p>
              <h3 id={`profile-${laneConfig.lane}-reviews-title`} class="text-base font-black text-foreground">{laneConfig.title}</h3>
            </div>
            <span class="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground">
              {t('user.profile_reviews.lane_count', { count: laneConfig.count }, `${laneConfig.count} rows`)}
            </span>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-1.5">
              {#each laneConfig.filters as [value, label]}
                <button
                  type="button"
                  class={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${laneConfig.filter === value ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:border-foreground'}`}
                  onclick={() => setLaneFilter(laneConfig.lane, value)}
                >
                  {label}
                </button>
              {/each}
            </div>

            <label class="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
              {t('user.profile_reviews.sort_label', {}, 'Sort')}
              <select
                class="max-w-28 border-0 bg-transparent text-xs font-bold normal-case tracking-normal text-foreground outline-none"
                value={laneConfig.sort}
                onchange={(event) => {
                  const value = (event.currentTarget as HTMLSelectElement).value as HistorySortMode
                  if (laneConfig.lane === 'received') {
                    setLaneSort('received', value)
                  } else {
                    setLaneSort('sent', value)
                  }
                }}
              >
                <option value="recent">{t('user.profile_reviews.sort.recent', {}, 'Newest')}</option>
                <option value="score-desc">{t('user.profile_reviews.sort.score_desc', {}, 'High score')}</option>
                <option value="score-asc">{t('user.profile_reviews.sort.score_asc', {}, 'Low score')}</option>
                <option value="kind">{t('user.profile_reviews.sort.kind', {}, 'Kind')}</option>
              </select>
            </label>
          </div>

          <div class="mt-4 flex flex-1 flex-col space-y-3">
            {#if laneItems(laneConfig.lane).length === 0}
              <div class="rounded-xl border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                {laneConfig.lane === 'received'
                  ? t('user.profile_reviews.empty_received', {}, 'No reviews received yet.')
                  : t('user.profile_reviews.empty_sent', {}, 'No reviews authored yet.')}
              </div>
            {:else}
              {#each paginatedLaneItems(laneConfig.lane) as item (item.id)}
                <article class="grid min-h-[168px] gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:items-start">
                  <div class="grid h-12 w-12 place-items-center rounded-xl border border-foreground bg-primary text-sm font-black text-primary-foreground">
                    {typeof item.rating === 'number'
                      ? item.rating.toFixed(1)
                      : t('user.profile_reviews.rating_unavailable', {}, 'N/A')}
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap gap-1.5">
                      <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-foreground">
                        {laneDirectionLabel(laneConfig.lane)}
                      </span>
                      <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        {kindLabel(item.kind)}
                      </span>
                      <span class="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <h4 class="mt-2 break-words text-sm font-black text-foreground">{item.title}</h4>
                    {#if item.comment}
                      <p class="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.comment}</p>
                    {/if}
                    <p class="mt-2 line-clamp-2 text-xs font-semibold text-muted-foreground">
                      {item.counterpartLabel} · {item.contextLabel} · {dateLabel(item.submittedAt)}
                    </p>
                  </div>

                  <Link
                    href={item.detailUrl}
                    class="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
                  >
                    {t('user.profile_reviews.details', {}, 'Details')}
                    <ArrowRight class="h-3.5 w-3.5" />
                  </Link>
                </article>
              {/each}
            {/if}
          </div>

          <div class="mt-auto flex min-h-[72px] items-end border-t border-border">
            {#if lanePagination(laneConfig.lane).lastPage > 1}
              <UnifiedOffsetPagination
                pagination={lanePagination(laneConfig.lane)}
                onPageChange={(page: number) => setLanePage(laneConfig.lane, page)}
                class="w-full"
              />
            {/if}
          </div>
        </section>
      {/each}
    </div>
  {:else if featuredReviews.length === 0}
    <div class="rounded-xl border border-border bg-card p-6 text-center">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t('user.profile_reviews.empty_eyebrow', {}, 'Review evidence')}
      </p>
      <h3 class="mt-2 text-xl font-black text-foreground">
        {t('user.profile_reviews.empty_featured_title', {}, 'No featured reviews to show yet.')}
      </h3>
      <p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {t('user.profile_reviews.empty_featured_desc', {}, 'When task reviews are confirmed, the strongest feedback becomes public evidence on the profile.')}
      </p>
    </div>
  {:else}
    <div class="grid gap-3 md:grid-cols-2">
      {#each sortedReviews as item (item.skill_id)}
        <article class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-xs font-black text-foreground">
              {item.skill_name.slice(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-bold text-foreground">{item.skill_name}</p>
                <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {levelBadgeClass(item.verified_public_proficiency_code)}">
                  {levelLabel(item.verified_public_proficiency_code)}
                </span>
              </div>
              <p class="truncate text-[11px] text-muted-foreground">{item.reviewer_name} · {item.reviewer_role}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="flex gap-0.5" aria-label={starsAriaLabel(item.stars)}>
                {#each Array.from({ length: 5 }) as _, i}
                  <span class={i < item.stars ? 'text-orange' : 'text-border'}>★</span>
                {/each}
              </div>
              {#if item.avg_percentage}
                <span class="text-[10px] font-bold text-muted-foreground">{item.avg_percentage.toFixed(0)}%</span>
              {/if}
            </div>
          </div>

          <p class="mt-3 text-xs leading-5 text-foreground">{item.content}</p>

          <div class="mt-3 flex items-center justify-between border-t border-border pt-2">
            <p class="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {item.task_name}
            </p>
            <span class="text-[10px] font-bold text-muted-foreground">
              {t('user.profile_reviews.review_count', { count: item.total_reviews }, `${item.total_reviews} reviews`)}
            </span>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>
