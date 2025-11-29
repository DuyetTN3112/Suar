<script lang="ts">
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import type { PagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import PendingSprintReviewPackages from './components/pending_sprint_review_packages.svelte'
  import ReverseReviewList, { type ReverseReviewListItem } from './components/reverse_review_list.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
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
  <title>{t('task.reverse_reviews.legacy_title', {}, 'Environment review history')}</title>
</svelte:head>

<OrganizationLayout title={t('task.reverse_reviews.legacy_title', {}, 'Environment review history')}>
  <div class="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
    <div class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            {t('task.reverse_reviews.organization_eyebrow', {}, 'Organization listening desk')}
          </div>
          <h1 class="text-3xl font-black tracking-tight text-foreground">{t('task.reverse_reviews.legacy_title', {}, 'Environment review history')}</h1>
          <p class="text-muted-foreground text-sm font-light max-w-3xl leading-relaxed">
            {t('task.reverse_reviews.legacy_subtitle_org', {}, 'Work environment and manager reviews recorded after sprints.')}
          </p>
        </div>

        <div class="grid grid-cols-3 gap-2 min-w-[240px] w-full lg:w-auto">
          <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
            <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.signal_volume', {}, 'Signal volume')}</span>
            <span class="block text-primary text-lg font-black">{stats.total}</span>
            <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.total_feedback', {}, 'Total feedback')}</span>
          </div>
          <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
            <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.trust_shield', {}, 'Trust shield')}</span>
            <span class="block text-primary text-lg font-black">{stats.anonymous}</span>
            <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.anonymous', {}, 'Anonymous')}</span>
          </div>
          <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
            <span class="block text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reverse_reviews.target_spread', {}, 'Target spread')}</span>
            <span class="block text-primary text-lg font-black">{Object.keys(stats.byTargetType).length}</span>
            <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('task.reverse_reviews.targets', {}, 'Targets')}</span>
          </div>
        </div>
      </div>
    </div>

    <PendingSprintReviewPackages />

    <ReverseReviewList
      {reviews}
      {pagination}
      {stats}
      baseUrl="/org/reverse-reviews"
      scope="me"
    />
  </div>
</OrganizationLayout>
