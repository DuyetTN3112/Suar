<script lang="ts">
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import TalentExplainabilityBadges from '@/apps/user/modules/profile/components/talent_explainability_badges.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { FitLabel, RankedApplication } from '@/apps/shared/tasks/task_application_types'

  interface Props {
    ranking?: RankedApplication
    rankingLoaded: boolean
    evidenceConfidenceBadgeVariant: (confidence?: string) => 'default' | 'secondary' | 'destructive' | 'outline'
    evidenceConfidenceLabel: (confidence?: string) => string
    fitLabel: (fit?: FitLabel) => string
  }

  const {
    ranking,
    rankingLoaded,
    evidenceConfidenceBadgeVariant,
    evidenceConfidenceLabel,
    fitLabel,
  }: Props = $props()

  const { t } = useTranslation()

  function clampPercent(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score * 100)))
  }

  function metricLabel(label: string, score: number | null | undefined): string | null {
    if (score == null) return null
    return `${label}: ${clampPercent(score)}%`
  }
</script>

{#if ranking?.matchScore != null}
  <div class="space-y-1.5">
    <div class="flex flex-wrap items-center gap-1.5">
      {#if ranking.rank}
        <Badge variant="outline" class="text-[10px] font-bold">
          #{ranking.rank}
        </Badge>
      {/if}
      <p class="font-bold">{clampPercent(ranking.matchScore)}%</p>
      <Badge
        variant={evidenceConfidenceBadgeVariant(ranking.evidenceConfidence)}
        class="text-[10px] font-bold"
      >
        {evidenceConfidenceLabel(ranking.evidenceConfidence)}
      </Badge>
      <Badge variant="outline" class="text-[10px] font-bold">
        {fitLabel(ranking.fitLabel)}
      </Badge>
    </div>
    <div class="flex flex-wrap gap-1">
      {#each [
        metricLabel(t('task.applications.metric.skill', {}, 'Skill'), ranking.skillMatch),
        metricLabel(t('task.applications.metric.domain', {}, 'Domain'), ranking.domainMatch),
        metricLabel(t('task.applications.metric.delivery', {}, 'Delivery'), ranking.deliveryReliability),
        metricLabel(t('task.applications.metric.trust', {}, 'Trust'), ranking.trustScore),
      ].filter(Boolean) as signal}
        <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {signal}
        </span>
      {/each}
    </div>
    {#if ranking.explanations?.length}
      <ul class="space-y-1 text-xs leading-5 text-muted-foreground">
        {#each ranking.explanations.slice(0, 2) as explanation}
          <li>{explanation}</li>
        {/each}
      </ul>
    {/if}
    {#if ranking.evidenceConfidence === 'low'}
      <p class="text-xs font-medium text-foreground">
        {t('task.applications.low_evidence_hint', {}, 'Evidence is not enough to treat this ranking as a final decision.')}
      </p>
    {/if}
    {#if ranking.evidenceWarnings?.length || ranking.risks?.length}
      <div class="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-foreground">
        {#each [...(ranking.evidenceWarnings ?? []), ...(ranking.risks ?? [])].slice(0, 2) as warning}
          <p>{warning}</p>
        {/each}
      </div>
    {/if}
    <TalentExplainabilityBadges
      reviewedSkillsCount={ranking.reviewedSkillsCount}
      importedSkillsCount={ranking.importedSkillsCount}
      underDisputeSkillsCount={ranking.underDisputeSkillsCount}
      latestConfidenceSignal={ranking.latestConfidenceSignal}
      containerClass="flex flex-wrap gap-1"
      badgeClass="text-[10px] font-bold"
    />
  </div>
{:else}
  <span class="text-muted-foreground">
    {rankingLoaded
      ? t('task.applications.no_ranking', {}, 'No ranking yet')
      : t('common.loading', {}, 'Loading')}
  </span>
{/if}
