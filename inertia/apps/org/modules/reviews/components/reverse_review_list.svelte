<script lang="ts">
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import type { PagePagination } from '@/apps/org/shared/lib/pagination'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import SimplePagination from './simple_pagination.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  export interface ReverseReviewListItem {
    id: string
    targetLabel: string
    targetType?: string
    targetTypeLabel: string
    authorLabel: string
    submittedAtLabel: string
    rating: number
    comment: string | null
    isAnonymous: boolean
  }

  interface Props {
    title?: string
    description?: string
    reviews: ReverseReviewListItem[]
    stats: {
      total: number
      anonymous: number
      byTargetType: Record<string, number>
    }
    scope: 'me' | 'org' | 'admin'
    pagination?: PagePagination
    baseUrl?: string
  }

  const {
    reviews = [],
    stats = { total: 0, anonymous: 0, byTargetType: {} },
    pagination,
    baseUrl,
  }: Props = $props()

  const { t } = useTranslation()
  let filterTargetType = $state('')
  let filterMinRating = $state('')
  let showFilters = $state(false)

  function targetTypeLabel(targetType: string): string {
    const labels: Record<string, string> = {
      manager: t('task.reviews.reverse_list.target_type.manager', {}, 'Manager'),
      peer: t('task.reviews.reverse_list.target_type.peer', {}, 'Peer'),
      reviewee: t('task.reviews.reverse_list.target_type.reviewee', {}, 'Reviewee'),
      self: t('task.reviews.reverse_list.target_type.self', {}, 'Self'),
      organization: t('task.reviews.reverse_list.target_type.organization', {}, 'Organization'),
      project: t('task.reviews.reverse_list.target_type.project', {}, 'Project'),
    }

    return labels[targetType] ?? targetType
  }

  const targetTypes = $derived(Object.keys(stats.byTargetType))
  const targetTypeSummaries = $derived(
    Object.entries(stats.byTargetType).map(([targetType, count]) => ({
      targetType,
      count,
      label: targetTypeLabel(targetType),
    }))
  )

  const filteredReviews = $derived(
    reviews
      .filter(
        (r) =>
          !filterTargetType ||
          r.targetType === filterTargetType ||
          r.targetTypeLabel === targetTypeLabel(filterTargetType)
      )
      .filter((r) => {
        if (!filterMinRating) return true
        const min = Number(filterMinRating)
        return !Number.isNaN(min) && r.rating >= min
      })
  )
</script>

<div class="space-y-6" data-testid="reverse-review-filters">
  <!-- Filters control bar -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-wrap items-center gap-2">
      {#each targetTypeSummaries as summary}
        <Badge variant="secondary" class="rounded-full border border-border/70 px-3 py-1 text-[10px] uppercase tracking-wider font-bold">
          {summary.label} · {summary.count}
        </Badge>
      {/each}
    </div>
    
    <Button variant="outline" size="sm" class="h-8 text-xs font-bold" onclick={() => showFilters = !showFilters}>
      {showFilters ? t('task.reviews.reverse_list.hide_filters', {}, 'Hide filters') : t('task.reviews.reverse_list.show_filters', {}, 'Show filters')}
    </Button>
  </div>

  {#if targetTypeSummaries.length > 0}
    <div class="flex flex-wrap gap-2 text-sm text-muted-foreground">
      {#each targetTypeSummaries as summary}
        <span>{summary.label} {t('task.reviews.reverse_list.receives', {}, 'receives')} {summary.count} {t('task.reviews.reverse_list.responses', {}, 'responses')}.</span>
      {/each}
    </div>
  {/if}

  {#if showFilters}
    <Card class="rounded-xl border-border bg-background shadow-suar-xs">
      <CardContent class="grid gap-4 p-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
        <div class="space-y-2">
          <Label for="rr-filter-target-type" class="text-xs font-semibold">{t('task.reviews.reverse_list.filter_target_type', {}, 'Review type')}</Label>
          <select id="rr-filter-target-type" bind:value={filterTargetType} class="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
            <option value="">{t('task.reviews.reverse_list.all', {}, 'All')}</option>
            {#each targetTypes as tt}
              <option value={tt}>{targetTypeLabel(tt)}</option>
            {/each}
          </select>
        </div>
        <div class="space-y-2">
          <Label for="rr-filter-min-rating" class="text-xs font-semibold">{t('task.reviews.reverse_list.min_rating', {}, 'Minimum rating')}</Label>
          <Input id="rr-filter-min-rating" bind:value={filterMinRating} type="number" min="1" max="5" placeholder="1-5" class="h-9" />
        </div>
        <Button variant="outline" size="sm" class="h-9" onclick={() => { filterTargetType = ''; filterMinRating = ''; }}>
          {t('task.reviews.reverse_list.reset', {}, 'Reset')}
        </Button>
      </CardContent>
    </Card>
  {/if}

  <!-- Unified List Card container -->
  <Card class="rounded-xl border border-border bg-card shadow-suar-sm overflow-hidden">
    <CardHeader class="border-b border-border">
      <CardTitle class="text-xl font-bold text-foreground">{t('task.reviews.reverse_list.title', { total: stats.total }, `Feedback list (${stats.total})`)}</CardTitle>
    </CardHeader>
    <CardContent class="p-6 bg-transparent">
      {#if filteredReviews.length === 0}
        <div data-testid="reverse-review-empty-state" class="rounded-2xl border border-dashed border-border bg-background/70 py-12 text-center text-sm text-muted-foreground shadow-suar-xs">
          {reviews.length === 0 ? t('task.reviews.reverse_list.empty', {}, 'No feedback yet.') : t('task.reviews.reverse_list.no_results', {}, 'No results match current filters.')}
        </div>
      {:else}
        <div data-testid="reverse-review-list" class="grid gap-4 lg:grid-cols-2">
          {#each filteredReviews as review (review.id)}
            <article class="rounded-2xl border border-border bg-background p-4 shadow-suar-xs transition-all hover:shadow-suar-sm">
              <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3 mb-3">
                <div class="space-y-1.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" class="rounded-full px-2.5 py-0.5 text-[10px] font-bold">{review.targetLabel}</Badge>
                    <Badge variant="outline" class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{review.targetTypeLabel}</Badge>
                    {#if review.isAnonymous}
                      <Badge variant="outline" class="rounded-full border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                        {t('task.reviews.reverse_list.anonymous', {}, 'Anonymous')}
                      </Badge>
                    {/if}
                  </div>
                  <div class="text-xs text-muted-foreground">
                    {t('task.reviews.reverse_list.author', {}, 'Author')}:
                    <span class="font-semibold text-foreground">{review.authorLabel}</span>
                    <span class="mx-1.5 text-border">•</span>
                    {review.submittedAtLabel}
                  </div>
                </div>
                <div class="text-right">
                  <div class="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                    {review.rating} / 5
                  </div>
                </div>
              </div>

              <div class="space-y-1">
                <p class="text-sm leading-relaxed text-foreground break-words">{review.comment ?? t('task.reviews.reverse_list.no_comment', {}, 'No detailed feedback')}</p>
              </div>

              <div class="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2.5">
                <span>ID: {review.id.slice(0, 8)}</span>
                <span class="font-medium">
                  {review.isAnonymous
                    ? t('task.reviews.reverse_list.identity_protected', {}, 'Identity protected')
                    : t('task.reviews.reverse_list.public_feedback', {}, 'Public feedback')}
                </span>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </CardContent>
    {#if pagination && baseUrl}
      <div class="border-t border-border bg-secondary/20 p-6">
        <SimplePagination {pagination} {baseUrl} />
      </div>
    {/if}
  </Card>
</div>
