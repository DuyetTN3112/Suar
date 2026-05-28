<script lang="ts">
  import { buildProfileChartCardSummary } from '../profile_chart_summary'
  import { getProfileGroupStyle } from '../profile_theme'
  import { formatPercent } from '../profile_view_helpers'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { ProfileChartCardSummary, SpiderChartPoint } from '../types.svelte'

  interface Props {
    categoryCode: 'technology' | 'engineering' | 'soft_skill' | 'delivery'
    points: SpiderChartPoint[]
    totalSkills?: number
    verifiedSkills?: number
    importedSkills?: number
    disputedSkills?: number
    summary?: ProfileChartCardSummary | null
  }

  const {
    categoryCode,
    points,
    totalSkills = points.length,
    verifiedSkills,
    importedSkills,
    disputedSkills,
    summary = null,
  }: Props = $props()
  const { t } = useTranslation()

  const style = $derived(getProfileGroupStyle(categoryCode))
  const categoryLabel = $derived(t(`user.profile_categories.${categoryCode}`, {}, style.title))
  const unknownSkillLabel = $derived(t('user.profile_spider.unknown_skill', {}, 'Unknown'))
  const normalizedPoints = $derived(
    points.map((point) => {
      const raw = point as unknown as Record<string, unknown>
      const totalReviews = Number(raw.total_reviews ?? raw.totalReviews ?? 0)
      const source: SpiderChartPoint['source'] =
        raw.source === 'reviewed' || raw.source === 'imported'
          ? raw.source
          : totalReviews > 0
            ? 'reviewed'
            : 'imported'
      const governanceState: SpiderChartPoint['governance_state'] =
        raw.governance_state === 'verified' ||
        raw.governance_state === 'under_dispute' ||
        raw.governance_state === 'unreviewed'
          ? raw.governance_state
          : totalReviews > 0
            ? 'verified'
            : 'unreviewed'

      return {
        ...point,
        avg_percentage: Number(raw.avg_percentage ?? raw.avgPercentage ?? 0),
        total_reviews: totalReviews,
        source,
        governance_state: governanceState,
      }
    })
  )
  const reviewedPoints = $derived(
    normalizedPoints.filter((point) => point.source === 'reviewed' || point.total_reviews > 0)
  )
  const sortedPoints = $derived(
    [...reviewedPoints].sort(
      (a, b) =>
        (b.avg_percentage - a.avg_percentage) || (b.total_reviews - a.total_reviews)
    )
  )
  const chartPoints = $derived(sortedPoints.slice(0, 6))
  const verifiedAverageScore = $derived.by(() => {
    return effectiveSummary.verified_average_score
  })
  const highestVerifiedSkill = $derived.by(() => {
    if (effectiveSummary.strongest_verified_skill_name) {
      return (
        chartPoints.find((point) => point.skill_name === effectiveSummary.strongest_verified_skill_name) ??
        chartPoints[0] ??
        null
      )
    }
    return chartPoints[0] ?? null
  })
  const mostEvidencedSkill = $derived(
    [...reviewedPoints].sort(
      (a, b) =>
        (b.total_reviews - a.total_reviews) || (b.avg_percentage - a.avg_percentage)
    )[0] ?? null
  )
  const effectiveVerifiedSkills = $derived(
    verifiedSkills ?? reviewedPoints.length
  )
  const effectiveImportedSkills = $derived(
    importedSkills ?? normalizedPoints.filter((point) => point.source === 'imported').length
  )
  const effectiveDisputedSkills = $derived(
    disputedSkills ??
      normalizedPoints.filter((point) => point.governance_state === 'under_dispute').length
  )
  const fallbackSummary = $derived.by(() =>
    buildProfileChartCardSummary({
      points: normalizedPoints,
      totalSkills,
      verifiedSkills: effectiveVerifiedSkills,
      importedSkills: effectiveImportedSkills,
      disputedSkills: effectiveDisputedSkills,
    })
  )
  const effectiveSummary = $derived(summary ?? fallbackSummary)
  const canRenderRadar = $derived(chartPoints.length >= 3)
  const axisPoints = $derived(canRenderRadar ? chartPoints : [])
  const chartMode = $derived.by(() => {
    return effectiveSummary.chart_mode
  })
  const mostEvidencedSkillName = $derived(
    effectiveSummary.most_evidenced_skill_name ?? mostEvidencedSkill?.skill_name ?? unknownSkillLabel
  )
  const mostEvidencedReviewCount = $derived(
    effectiveSummary.most_evidenced_review_count ?? mostEvidencedSkill?.total_reviews ?? 0
  )
  const size = 280
  const center = size / 2
  const radius = 96
  const levels = [20, 40, 60, 80, 100]

  function angleFor(index: number, count: number): number {
    return (2 * Math.PI * index) / count - Math.PI / 2
  }

  function polarToCartesian(angle: number, radial: number) {
    return {
      x: center + Math.cos(angle) * radial,
      y: center + Math.sin(angle) * radial,
    }
  }

  function polygonPoints(scale: number): string {
    return axisPoints
      .map((_point, index) => {
        const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
        return `${position.x},${position.y}`
      })
      .join(' ')
  }

  const ringPolygons = $derived(levels.map((level) => polygonPoints(level / 100)))

  const dataPolygon = $derived(
    axisPoints
      .map((point, index) => {
        const scale = Math.max(0, Math.min(point.avg_percentage, 100)) / 100
        const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
        return `${position.x},${position.y}`
      })
      .join(' ')
  )
  const dataPolyline = $derived.by(() => {
    if (axisPoints.length === 0) return ''

    const pointsList = axisPoints.map((point, index) => {
      const scale = Math.max(0, Math.min(point.avg_percentage, 100)) / 100
      const position = polarToCartesian(angleFor(index, axisPoints.length), radius * scale)
      return `${position.x},${position.y}`
    })

    return [...pointsList, pointsList[0]].join(' ')
  })

  const axisLabels = $derived(
    axisPoints.map((point, index) => {
      const position = polarToCartesian(angleFor(index, axisPoints.length), radius + 26)
      return {
        x: position.x,
        y: position.y,
        label: point.skill_name.length > 14 ? `${point.skill_name.slice(0, 14)}…` : point.skill_name,
      }
    })
  )
</script>

<article class={`rounded-[26px] border p-4 shadow-[0_16px_45px_rgba(15,23,42,0.08)] ${style.borderClass} ${style.surfaceClass}`}>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class={`text-[11px] font-bold uppercase tracking-[0.18em] ${style.textClass}`}>{categoryLabel}</p>
      <h3 class="mt-2 text-lg font-black text-foreground">{t('user.profile_spider.verified_capability', {}, 'Verified capability')}</h3>
      <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
        <span class="rounded-full border border-border/70 bg-card px-2.5 py-1 uppercase tracking-[0.14em] text-foreground">
          {t(`user.profile_spider.chart_modes.${chartMode}`, {}, chartMode === 'radar' ? 'Radar mode' : chartMode === 'list_fallback' ? 'List fallback' : 'Insufficient data')}
        </span>
        {#if effectiveDisputedSkills > 0}
          <span class="rounded-full border border-border/70 bg-card px-2.5 py-1 text-foreground">
            {t('user.profile_spider.dispute_signal', { count: effectiveDisputedSkills }, ':count dispute signal')}
          </span>
        {/if}
      </div>
    </div>

    <div class="rounded-2xl border border-background/80 bg-card/80 px-3 py-2 text-right shadow-sm dark:bg-black/10">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.verified_avg', {}, 'Verified avg')}</p>
      <p class={`mt-1 text-2xl font-black ${style.textClass}`}>{formatPercent(verifiedAverageScore, 1)}</p>
    </div>
  </div>

  {#if chartPoints.length === 0}
    <div class="mt-4 rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-12 text-center text-sm font-medium text-muted-foreground">
      {t('user.profile_spider.empty_reviewed_group', {}, 'No reviewed data for this group yet.')}
    </div>
  {:else}
    <div class="mt-4 space-y-4">
      <div class="rounded-[24px] border border-border/70 bg-card/80 p-4 shadow-sm dark:border-white/10 dark:bg-black/10">
        {#if canRenderRadar}
          <svg viewBox={`0 0 ${size} ${size}`} class="mx-auto h-auto w-full max-w-[18rem] overflow-visible">
            {#each ringPolygons as ring}
              <polygon points={ring} fill="none" stroke="currentColor" stroke-width="1" class="text-border/70" />
            {/each}

            {#each axisPoints as _point, index}
              {@const axisEnd = polarToCartesian(angleFor(index, axisPoints.length), radius)}
              <line
                x1={center}
                y1={center}
                x2={axisEnd.x}
                y2={axisEnd.y}
                stroke="currentColor"
                stroke-width="1"
                class="text-border/70"
              />
            {/each}

            <polygon points={dataPolygon} fill={style.fillColor} stroke="none" />
            <polyline
              points={dataPolyline}
              fill="none"
              stroke={style.strokeColor}
              stroke-width="3"
              stroke-linejoin="round"
              stroke-linecap="round"
            />

            {#each axisPoints as point, index}
              {@const dot = polarToCartesian(angleFor(index, axisPoints.length), radius * (Math.max(0, Math.min(point.avg_percentage, 100)) / 100))}
              <circle cx={dot.x} cy={dot.y} r="4" fill={style.strokeColor} />
            {/each}

            {#each axisLabels as label}
              {#if label.label}
                <text
                  x={label.x}
                  y={label.y}
                  text-anchor={label.x < center - 8 ? 'end' : label.x > center + 8 ? 'start' : 'middle'}
                  dominant-baseline={label.y > center + 8 ? 'hanging' : label.y < center - 8 ? 'auto' : 'middle'}
                  class="fill-muted-foreground text-[10px] font-semibold"
                >
                  {label.label}
                </text>
              {/if}
            {/each}
          </svg>
        {:else}
          <div class="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            {t('user.profile_spider.radar_needs_points', {}, 'At least 3 reviewed skills are required to draw radar.')}
          </div>
        {/if}

        <div class="mt-4 grid gap-2 sm:grid-cols-4">
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.reviewed_points', {}, 'Reviewed points')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{chartPoints.length}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.coverage', {}, 'Coverage')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{t('user.profile_spider.coverage_value', { verified: effectiveVerifiedSkills, total: totalSkills }, ':verified/:total verified')}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.imported_claims', {}, 'Imported claims')}</p>
            <p class="mt-1 text-lg font-black text-foreground">{t('user.profile_spider.imported_claims_value', { count: effectiveImportedSkills }, ':count imported claim')}</p>
          </div>
          <div class="rounded-2xl border border-border/60 bg-background/70 px-3 py-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.highest_verified', {}, 'Highest verified')}</p>
            <p class="mt-1 truncate text-lg font-black text-foreground">{highestVerifiedSkill?.skill_name ?? unknownSkillLabel}</p>
            <p class="mt-1 text-[11px] font-semibold text-muted-foreground">
              {formatPercent(highestVerifiedSkill?.avg_percentage ?? null, 0)}
            </p>
          </div>
        </div>

        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          <div class="rounded-2xl border border-border/60 bg-card/78 px-3 py-3 shadow-sm dark:bg-black/10">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.most_evidenced', {}, 'Most evidenced')}</p>
            <p class="mt-1 truncate text-base font-black text-foreground">{mostEvidencedSkillName}</p>
            {#if effectiveDisputedSkills > 0}
              <p class="mt-1 text-[11px] font-semibold text-muted-foreground">
                {t('user.profile_spider.review_dispute_count', { reviews: mostEvidencedReviewCount, disputes: effectiveDisputedSkills }, ':reviews reviews · :disputes disputes')}
              </p>
            {:else}
              <p class="mt-1 text-[11px] font-semibold text-muted-foreground">
                {t('user.profile_spider.review_count', { count: mostEvidencedReviewCount }, ':count reviews')}
              </p>
            {/if}
          </div>

          <div class="rounded-2xl border border-border/60 bg-card/78 px-3 py-3 shadow-sm dark:bg-black/10">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_spider.imported_claims', {}, 'Imported claims')}</p>
            <p class="mt-1 text-base font-black text-foreground">
              {t('user.profile_spider.imported_claims_value', { count: effectiveImportedSkills }, ':count imported claim')}
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-2 sm:grid-cols-2">
        {#each chartPoints as point (point.skill_id)}
          <div class="rounded-2xl border border-border/60 bg-card/78 px-3 py-3 shadow-sm dark:bg-black/10">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-foreground">{point.skill_name}</p>
                <p class="mt-1 text-[11px] font-semibold text-muted-foreground">{t('user.profile_spider.review_count', { count: point.total_reviews }, ':count reviews')}</p>
              </div>
              <span class={`rounded-full px-2.5 py-1 text-xs font-black ${style.badgeClass}`}>
                {formatPercent(point.avg_percentage, 0)}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</article>
