<script lang="ts">
  import { Sparkles } from 'lucide-svelte'
  import { formatCompactNumber, formatPercent, type CredibilityMetricsSummary } from '../profile_view_helpers'

  interface Props {
    displayedCredibilityScore: number | null
    reviewAccuracy: number | null
    credibilityMetrics: CredibilityMetricsSummary
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const { displayedCredibilityScore, reviewAccuracy, credibilityMetrics, t }: Props = $props()
</script>

<article class="rounded-[24px] border border-border bg-card p-4 text-foreground shadow-suar-xs">
  <div class="flex items-center justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t('user.profile_overview.review_credibility', {}, 'Review credibility')}
      </p>
      <p class="mt-2 text-2xl font-black text-foreground">
        {formatCompactNumber(displayedCredibilityScore, 1)}
      </p>
    </div>
    <div class="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
      <Sparkles class="mr-1 inline size-3 text-primary" />
      {t('user.profile_overview.review_accuracy', { value: formatPercent(reviewAccuracy, 1) }, `${formatPercent(reviewAccuracy, 1)} review accuracy`)}
    </div>
  </div>

  <div class="mt-4 grid gap-3 grid-cols-3">
    <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
      <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.reviews_given', {}, 'Reviews given')}</p>
      <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.total_reviews_given, 0)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
      <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.accurate', {}, 'Accurate')}</p>
      <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.accurate_reviews, 0)}</p>
    </div>
    <div class="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
      <p class="text-xs font-semibold text-muted-foreground">{t('user.profile_overview.disputed', {}, 'Disputed')}</p>
      <p class="mt-1 text-lg font-black text-foreground">{formatCompactNumber(credibilityMetrics.disputed_reviews, 0)}</p>
    </div>
  </div>
</article>
