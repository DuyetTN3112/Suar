<script lang="ts">
  import type { PagePagination } from '@/apps/admin/shared/lib/pagination'
  import ReverseReviewList, { type ReverseReviewListItem } from '@/apps/admin/modules/reviews/components/reverse_review_list.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    reviews: ReverseReviewListItem[]
    pagination: PagePagination
    stats: {
      total: number
      anonymous: number
      byTargetType: Record<string, number>
    }
  }

  const { reviews, pagination, stats }: Props = $props()
  const { t } = useTranslation()
</script>

<svelte:head>
  <title>{t('task.reverse_reviews.admin_title', {}, 'System reverse reviews')}</title>
</svelte:head>

<div class="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
  <div class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
    <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          {t('task.reverse_reviews.admin_eyebrow', {}, 'System observability')}
        </div>
        <h1 class="text-3xl font-black tracking-tight text-foreground">{t('task.reverse_reviews.admin_title', {}, 'System reverse reviews')}</h1>
        <p class="text-muted-foreground text-sm font-light max-w-3xl leading-relaxed">
          {t('task.reverse_reviews.admin_subtitle', {}, 'System-wide reverse feedback monitoring surface for administrators.')}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 min-w-[240px] w-full lg:w-auto">
        <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
          <span class="block text-primary text-lg font-black">{stats.total}</span>
          <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.total_feedback', {}, 'Total feedback')}</span>
        </div>
        <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
          <span class="block text-primary text-lg font-black">{stats.anonymous}</span>
          <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.anonymous', {}, 'Anonymous')}</span>
        </div>
        <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
          <span class="block text-primary text-lg font-black">{Object.keys(stats.byTargetType).length}</span>
          <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.target_spread', {}, 'Target spread')}</span>
        </div>
      </div>
    </div>
  </div>

  <ReverseReviewList
    {reviews}
    {pagination}
    {stats}
    baseUrl="/admin/reverse-reviews"
    scope="admin"
  />
</div>
