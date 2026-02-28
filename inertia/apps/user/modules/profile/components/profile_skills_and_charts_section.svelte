<script lang="ts">
  import {
    PROFILE_CATEGORY_ORDER,
    getProfileGroupStyle,
    getProfileLevelClass,
    getProfileLevelLabel,
  } from '../profile_theme'
  import { formatPercent } from '../profile_view_helpers'
  import { buildProfileChartCardSummary } from '../profile_chart_summary'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { ProfileChartCardSummary, SkillEvidenceHistoryEntry, SpiderChartPoint } from '../types.svelte'
  import ProfileSpiderChartCard from './profile_spider_chart_card.svelte'

  interface SkillItem {
    id: string
    skill_id?: string
    skill_name: string
    category_code?: string
    verified_public_proficiency_code: string | null
    total_reviews: number
    avg_percentage?: number | null
    evidence_count?: number
    evidence_history?: SkillEvidenceHistoryEntry[]
    last_reviewed_at?: string | null
    source?: string | null
    confidence_signal?: 'low' | 'medium' | 'high' | null
    freshness_state?: 'unreviewed' | 'fresh' | 'stale' | null
    governance_state?: 'unreviewed' | 'verified' | 'under_dispute' | null
  }

  interface SkillGroup {
    code: string
    title: string
    bgClass: string
    items: SkillItem[]
  }

  interface SpiderChartData {
    technology: SpiderChartPoint[]
    engineering: SpiderChartPoint[]
    soft_skills: SpiderChartPoint[]
    delivery: SpiderChartPoint[]
  }

  interface ChartCardInput {
    categoryCode: 'technology' | 'engineering' | 'soft_skill' | 'delivery'
    points: SpiderChartPoint[]
    totalSkills: number
    verifiedSkills: number
    importedSkills: number
    disputedSkills: number
    summary: ProfileChartCardSummary
  }

  interface Props {
    groupedSkills: SkillGroup[]
    spiderChartData: SpiderChartData
    neoBrutalCard: string
    showCharts?: boolean
  }

  const { groupedSkills, spiderChartData, neoBrutalCard, showCharts = true }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium' }))

  function profileLevelLabel(levelCode?: string | null): string {
    return t(
      `user.proficiency_levels.labels.${levelCode ?? 'unknown'}`,
      {},
      getProfileLevelLabel(levelCode)
    )
  }

  function formatSkillScore(value?: number | null): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? formatPercent(value, 1)
      : t('user.profile_skills.score_unreviewed', {}, 'Not reviewed')
  }

  function formatDate(value?: string | null): string | null {
    if (!value) return null

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null

    return dateFormatter.format(date)
  }

  function evidenceLabel(count?: number): string {
    const total = typeof count === 'number' && Number.isFinite(count) ? count : 0
    return t('user.profile_skills.evidence_sources', { count: total }, ':count evidence sources')
  }

  function formatConfidenceLabel(value?: SkillItem['confidence_signal']): string | null {
    if (!value) return null

    const fallbackValue = value.charAt(0).toUpperCase() + value.slice(1)
    const translatedValue = t(`user.profile_skills.confidence.${value}`, {}, fallbackValue)
    return t('user.profile_skills.confidence_label', { value: translatedValue }, 'Confidence: :value')
  }

  function formatFreshnessLabel(value?: SkillItem['freshness_state']): string | null {
    if (!value) return null

    const fallbackLabels: Record<NonNullable<SkillItem['freshness_state']>, string> = {
      unreviewed: 'Not reviewed',
      fresh: 'Recent review',
      stale: 'Stale review',
    }

    return t(`user.profile_skills.freshness.${value}`, {}, fallbackLabels[value])
  }

  function formatGovernanceLabel(value?: SkillItem['governance_state']): string | null {
    if (!value) return null

    const fallbackLabels: Record<NonNullable<SkillItem['governance_state']>, string> = {
      unreviewed: 'Not verified',
      verified: 'Verified',
      under_dispute: 'In dispute',
    }

    return t(`user.profile_skills.governance.${value}`, {}, fallbackLabels[value])
  }

  const totalSkillCount = $derived(
    groupedSkills.reduce((sum, group) => sum + group.items.length, 0)
  )
  const totalReviewedSkills = $derived(
    groupedSkills.reduce(
      (sum, group) => sum + group.items.filter((item) => item.total_reviews > 0).length,
      0
    )
  )
  const totalImportedClaims = $derived(
    groupedSkills.reduce(
      (sum, group) => sum + group.items.filter((item) => item.total_reviews === 0).length,
      0
    )
  )
  const totalDisputedSkills = $derived(
    groupedSkills.reduce(
      (sum, group) =>
        sum + group.items.filter((item) => item.governance_state === 'under_dispute').length,
      0
    )
  )
  const detailedInventoryGroups = $derived.by(() => {
    const groupedByCode = new Map(groupedSkills.map((group) => [group.code, group]))
    const canonicalGroups = PROFILE_CATEGORY_ORDER.map((categoryCode) => {
      const group = groupedByCode.get(categoryCode)
      const style = getProfileGroupStyle(categoryCode)

      return {
        code: categoryCode,
        title: style.title,
        items: group?.items ?? [],
      }
    })
    const extraGroups = groupedSkills
      .filter((group) => !PROFILE_CATEGORY_ORDER.includes(group.code as never))
      .sort((left, right) => left.code.localeCompare(right.code))

    return [...canonicalGroups, ...extraGroups]
  })
  const chartCards = $derived.by(() => {
    const groupedByCode = new Map(groupedSkills.map((group) => [group.code, group]))

    const buildFallbackCard = (
      categoryCode: ChartCardInput['categoryCode'],
      fallbackPoints: SpiderChartPoint[]
    ): ChartCardInput => {
      const normalizedPoints = fallbackPoints.map((point) => {
        const source: 'reviewed' | 'imported' =
          point.source === 'reviewed' || point.total_reviews > 0
            ? 'reviewed'
            : 'imported'

        return {
          ...point,
          source,
          governance_state:
            point.governance_state ?? (point.total_reviews > 0 ? 'verified' : 'unreviewed'),
        }
      })

      const cardInput = {
        categoryCode,
        points: normalizedPoints,
        totalSkills: normalizedPoints.length,
        verifiedSkills: normalizedPoints.filter((point) => point.source === 'reviewed').length,
        importedSkills: normalizedPoints.filter((point) => point.source === 'imported').length,
        disputedSkills: normalizedPoints.filter((point) => point.governance_state === 'under_dispute').length,
      }

      return {
        ...cardInput,
        summary: buildProfileChartCardSummary(cardInput),
      }
    }

    const buildGroupedCard = (
      categoryCode: ChartCardInput['categoryCode'],
      group: SkillGroup
    ): ChartCardInput => {
      const cardInput: Omit<ChartCardInput, 'summary'> = {
        categoryCode,
        points: group.items.map((item) => ({
        skill_id: item.skill_id ?? item.id,
        skill_name: item.skill_name,
        skill_code: item.skill_id ?? item.id,
        category_code: group.code,
        avg_percentage: item.avg_percentage ?? 0,
        verified_public_proficiency_code: item.verified_public_proficiency_code,
        total_reviews: item.total_reviews,
        source: item.source === 'reviewed' ? 'reviewed' as const : 'imported' as const,
        governance_state: item.governance_state ?? (item.total_reviews > 0 ? 'verified' : 'unreviewed'),
        })),
        totalSkills: group.items.length,
        verifiedSkills: group.items.filter((item) => item.total_reviews > 0).length,
        importedSkills: group.items.filter((item) => item.total_reviews === 0).length,
        disputedSkills: group.items.filter((item) => item.governance_state === 'under_dispute').length,
      }

      return {
        ...cardInput,
        summary: buildProfileChartCardSummary(cardInput),
      }
    }

    const chartEntries: [ChartCardInput['categoryCode'], SpiderChartPoint[]][] = [
      ['technology', spiderChartData.technology],
      ['engineering', spiderChartData.engineering],
      ['soft_skill', spiderChartData.soft_skills],
      ['delivery', spiderChartData.delivery],
    ]

    return chartEntries.map(([categoryCode, fallbackPoints]) => {
      const group = groupedByCode.get(categoryCode)
      return group
        ? buildGroupedCard(categoryCode, group)
        : buildFallbackCard(categoryCode, fallbackPoints)
    })
  })
</script>

<section class="space-y-4">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_skills.eyebrow', {}, 'Skill atlas')}</p>
      <h2 class="mt-2 text-2xl font-black tracking-tight text-foreground">{t('user.profile_skills.title', {}, 'Capability map')}</h2>
    </div>

    <div class="flex flex-wrap gap-2 text-xs font-semibold">
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {t('user.profile_skills.total_skills', { count: totalSkillCount }, ':count skills')}
      </span>
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {t('user.profile_skills.reviewed_skills', { count: totalReviewedSkills }, ':count reviewed skills')}
      </span>
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {totalImportedClaims === 1
          ? t('user.profile_skills.imported_claim', { count: totalImportedClaims }, ':count imported claim')
          : t('user.profile_skills.imported_claims', { count: totalImportedClaims }, ':count imported claims')}
      </span>
      <span class="rounded-full border border-border bg-background px-3 py-1 text-foreground">
        {t('user.profile_skills.disputed_skills', { count: totalDisputedSkills }, ':count disputed')}
      </span>
    </div>
  </div>

  {#if totalSkillCount === 0}
    <div class="rounded-xl border border-border bg-card p-6 text-center">
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('user.profile_skills.empty_eyebrow', {}, 'Capability evidence')}</p>
      <h3 class="mt-2 text-xl font-black text-foreground">{t('user.profile_skills.empty_title', {}, 'No verified skills yet')}</h3>
      <p class="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {t('user.profile_skills.empty_description', {}, 'After tasks are reviewed and confirmed, skill evidence appears here.')}
      </p>
    </div>
  {/if}

  <div class={showCharts ? "grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)]" : "w-full"}>
    <div class={`${neoBrutalCard} rounded-[28px] border border-border bg-card p-5 shadow-suar-md ${showCharts ? "" : "w-full"}`}>
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_skills.inventory_eyebrow', {}, 'Detailed inventory')}</p>
          <h3 class="mt-2 text-xl font-black text-foreground">{t('user.profile_skills.inventory_title', {}, 'All skills by group')}</h3>
        </div>
        <p class="text-sm text-muted-foreground">{t('user.profile_skills.inventory_description', {}, 'Badge level + score + data source')}</p>
      </div>

      <div class="space-y-5">
        {#each detailedInventoryGroups as group (group.code)}
          {@const style = getProfileGroupStyle(group.code)}
          <section class={`rounded-[24px] border p-4 ${style.borderClass} ${style.surfaceClass}`}>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                  <span class={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${style.badgeClass}`}>
                  <span class={`h-2.5 w-2.5 ${style.dotClass}`}></span>
                  {t(`user.profile_categories.${group.code}`, {}, group.title)}
                </span>
                <span class="text-xs font-semibold text-muted-foreground">{t('user.profile_skills.group_skill_count', { count: group.items.length }, ':count skills')}</span>
              </div>
              <span class="text-xs font-semibold text-muted-foreground">
                {t('user.profile_skills.group_reviewed_count', { count: group.items.filter((item) => item.total_reviews > 0).length }, ':count reviewed')}
              </span>
            </div>

            {#if group.items.length === 0}
              <div class="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                {t('user.profile_skills.group_empty', {}, 'No skills in this group yet.')}
              </div>
            {:else}
              <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {#each group.items as skill (skill.id)}
                <article class="rounded-2xl border border-border/70 bg-card/85 p-3 shadow-sm dark:border-white/10 dark:bg-black/10">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-foreground">{skill.skill_name}</p>
                      <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                        <span>{t('user.profile_skills.review_count', { count: skill.total_reviews }, ':count reviews')}</span>
                        {#if skill.source}
                          <span class="rounded-full border border-border px-2 py-0.5 uppercase tracking-[0.12em]">
                            {skill.source === 'reviewed'
                              ? t('user.profile_skills.source_reviewed', {}, 'reviewed')
                              : t('user.profile_skills.source_imported', {}, 'self-declared')}
                          </span>
                        {/if}
                      </div>
                    </div>

                      <span class={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getProfileLevelClass(skill.verified_public_proficiency_code)}`}>
                        {profileLevelLabel(skill.verified_public_proficiency_code)}
                    </span>
                  </div>

                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <div class="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_skills.score_label', {}, 'Score')}</p>
                      <p class={`mt-1 text-lg font-black ${style.textClass}`}>
                        {formatSkillScore(skill.avg_percentage)}
                      </p>
                    </div>
                    <div class="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
                      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{t('user.profile_skills.signal_label', {}, 'Signal')}</p>
                      <p class="mt-1 text-lg font-black text-foreground">
                        {skill.total_reviews > 0
                          ? t('user.profile_skills.signal_verified', {}, 'Verified')
                          : t('user.profile_skills.signal_imported', {}, 'Imported')}
                      </p>
                    </div>
                  </div>

                  {#if skill.total_reviews > 0}
                    <div class="mt-3 rounded-xl border border-border/70 bg-background/60 px-3 py-3 text-xs">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <span class="font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {t('user.profile_skills.evidence_signal', {}, 'Evidence signal')}
                        </span>
                        <span class="font-semibold text-foreground">
                          {evidenceLabel(skill.evidence_count)}
                        </span>
                      </div>

                      <div class="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {#if formatDate(skill.last_reviewed_at)}
                          <span>{t('user.profile_skills.last_reviewed', {}, 'Last reviewed')}: {formatDate(skill.last_reviewed_at)}</span>
                        {/if}
                        {#if skill.source}
                          <span>{t('user.profile_skills.source_label', {}, 'Source')}: {skill.source}</span>
                        {/if}
                      </div>

                      <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                        {#if formatConfidenceLabel(skill.confidence_signal)}
                          <span class="rounded-full border border-border bg-card px-2 py-1 text-foreground">
                            {formatConfidenceLabel(skill.confidence_signal)}
                          </span>
                        {/if}
                        {#if formatFreshnessLabel(skill.freshness_state)}
                          <span class="rounded-full border border-border bg-card px-2 py-1 text-foreground">
                            {formatFreshnessLabel(skill.freshness_state)}
                          </span>
                        {/if}
                        {#if formatGovernanceLabel(skill.governance_state)}
                          <span class="rounded-full border border-border bg-card px-2 py-1 text-foreground">
                            {formatGovernanceLabel(skill.governance_state)}
                          </span>
                        {/if}
                      </div>

                      {#if (skill.evidence_history?.length ?? 0) > 0}
                        {@const primaryEvidence = skill.evidence_history?.[0]}
                        {#if primaryEvidence}
                          <div class="mt-3 space-y-1.5 rounded-lg border border-dashed border-border/70 bg-card/80 px-3 py-2">
                            <p class="font-semibold text-foreground">{primaryEvidence.task_title}</p>
                            <div class="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                              {#if primaryEvidence.reviewer_type}
                                <span>{primaryEvidence.reviewer_type}</span>
                              {/if}
                              {#if primaryEvidence.assigned_public_proficiency_code}
                                <span>{profileLevelLabel(primaryEvidence.assigned_public_proficiency_code)}</span>
                              {/if}
                              {#if formatDate(primaryEvidence.completed_at)}
                                <span>{formatDate(primaryEvidence.completed_at)}</span>
                              {/if}
                            </div>
                            {#if primaryEvidence.comment}
                              <p class="line-clamp-2 text-[11px] text-muted-foreground">
                                {primaryEvidence.comment}
                              </p>
                            {/if}
                          </div>
                        {/if}
                      {:else}
                        <p class="mt-3 text-[11px] text-muted-foreground">
                          {t('user.profile_skills.no_evidence_snapshot', {}, 'No evidence snapshot yet.')}
                        </p>
                      {/if}
                    </div>
                  {/if}
                </article>
                {/each}
              </div>
            {/if}
          </section>
        {/each}
      </div>
    </div>

    {#if showCharts}
      <div class="space-y-4">
        {#each chartCards as card (card.categoryCode)}
          <ProfileSpiderChartCard
            categoryCode={card.categoryCode}
          points={card.points}
          totalSkills={card.totalSkills}
          verifiedSkills={card.verifiedSkills}
          importedSkills={card.importedSkills}
          disputedSkills={card.disputedSkills}
          summary={card.summary}
        />
      {/each}
      </div>
    {/if}
  </div>
</section>
