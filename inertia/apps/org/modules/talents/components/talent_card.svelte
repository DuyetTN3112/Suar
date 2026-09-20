<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import {
    formatTalentConfidenceLabel,
    formatTalentCoverageLabel,
    formatTalentGovernanceLabel,
  } from '../talent_explainability'
  import type { Talent } from '../types'

  interface Props {
    talent: Talent
    isTaskRankingMode: boolean
    isExpanded: boolean
    onToggleExplainability: () => void
    onSave: (talent: Talent) => Promise<void>
    onRemove: (talent: Talent) => Promise<void>
  }

  const {
    talent,
    isTaskRankingMode,
    isExpanded,
    onToggleExplainability,
    onSave,
    onRemove,
  }: Props = $props()

  const { t } = useTranslation()

  function clampPercent(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0
    return Math.min(100, Math.max(0, Math.round(value)))
  }

  function hasTaskMatch(targetTalent: Talent) {
    return typeof targetTalent.match_score === 'number'
  }

  const explainabilityMetrics = $derived([
    {
      label: t('workspace.talents.metrics.skill', {}, 'Skill'),
      value: clampPercent(talent.skill_match),
      weight: '0.4',
    },
    {
      label: t('workspace.talents.metrics.domain', {}, 'Domain'),
      value: clampPercent(talent.domain_match),
      weight: '0.2',
    },
    {
      label: t('workspace.talents.metrics.delivery', {}, 'On time'),
      value: clampPercent(talent.delivery_reliability),
      weight: '0.2',
    },
    {
      label: t('workspace.talents.metrics.trust', {}, 'Trust'),
      value: clampPercent(talent.trust_score),
      weight: '0.2',
    },
  ])
</script>

<article class="rounded-xl border border-border bg-background p-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="font-bold text-foreground">{talent.username}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{talent.status ?? 'active'}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a class="rounded-md border border-border px-3 py-1 font-bold" href={`/org/talents/${talent.id}`}>
        {t('workspace.talents.profile', {}, 'Profile')}
      </a>
      {#if talent.bookmark?.isSaved}
        <button
          class="rounded-md border border-border px-3 py-1 font-bold"
          type="button"
          onclick={() => onRemove(talent)}
        >
          {t('workspace.talents.remove_saved', {}, 'Remove')}
        </button>
      {:else}
        <button
          class="rounded-md border border-border px-3 py-1 font-bold"
          type="button"
          onclick={() => onSave(talent)}
        >
          {t('workspace.talents.save', {}, 'Save talent')}
        </button>
      {/if}
    </div>
  </div>

  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
    <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
      {formatTalentCoverageLabel(talent.reviewed_skills_count, talent.imported_skills_count)}
    </span>
    {#if formatTalentConfidenceLabel(talent.latest_confidence_signal)}
      <span class="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground">
        {formatTalentConfidenceLabel(talent.latest_confidence_signal)}
      </span>
    {/if}
    {#if formatTalentGovernanceLabel(talent.under_dispute_skills_count)}
      <span class="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900">
        {formatTalentGovernanceLabel(talent.under_dispute_skills_count)}
      </span>
    {/if}
    {#if (talent.risks?.length ?? 0) > 0}
      <span class="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-semibold text-destructive">
        {talent.risks?.[0]}
      </span>
    {/if}
  </div>

  {#if isTaskRankingMode}
    <div data-testid="task-ranking-metrics" class="mt-3 grid gap-2 text-sm sm:grid-cols-4">
      <div>
        {t('workspace.talents.metrics.skill', {}, 'Skill')}
        <strong>{clampPercent(talent.skill_match)}</strong>
      </div>
      <div>
        {t('workspace.talents.metrics.domain', {}, 'Domain')}
        <strong>{clampPercent(talent.domain_match)}</strong>
      </div>
      <div>
        {t('workspace.talents.metrics.delivery', {}, 'On time')}
        <strong>{clampPercent(talent.delivery_reliability)}</strong>
      </div>
      <div>
        {t('workspace.talents.metrics.trust', {}, 'Trust')}
        <strong>{clampPercent(talent.trust_score)}</strong>
      </div>
    </div>
  {:else}
    <div data-testid="trust-only-metric" class="mt-3 text-sm">
      <span class="font-semibold text-muted-foreground">
        {t('workspace.talents.metrics.trust', {}, 'Trust')}
      </span>
      <strong class="ml-2 text-foreground">{clampPercent(talent.trust_score)}</strong>
    </div>
  {/if}

  {#if (talent.public_accomplishments?.length ?? 0) > 0}
    <section
      data-testid={`public-accomplishments-${talent.id}`}
      class="mt-4 border-t border-border pt-3"
      aria-label="Verified demonstrated work"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t('workspace.talents.demonstrated_work', {}, 'Demonstrated work')}
        </h3>
        <span class="text-xs text-muted-foreground">
          {t('workspace.talents.public_only', {}, 'Public-safe')}
        </span>
      </div>
      <div class="mt-2 grid gap-2">
        {#each talent.public_accomplishments ?? [] as accomplishment}
          <article class="rounded-lg border border-border bg-muted/10 p-3">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <h4 class="font-semibold text-foreground">{accomplishment.title}</h4>
              <span class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                {accomplishment.verification_status === 'verified' ? 'Verified' : 'Partially verified'}
              </span>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">{accomplishment.concise_statement}</p>
            <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
              <span class="rounded-full bg-muted px-2 py-1">{accomplishment.action}</span>
              <span class="rounded-full bg-muted px-2 py-1">{accomplishment.object}</span>
              <span class="rounded-full bg-muted px-2 py-1">{accomplishment.ownership_level}</span>
              <span class="rounded-full bg-muted px-2 py-1">{accomplishment.confidence_band} confidence</span>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  {#if isTaskRankingMode && hasTaskMatch(talent)}
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {t('workspace.talents.match_score', {}, 'Match score')}
        </p>
        <p class="text-2xl font-black text-foreground">{clampPercent(talent.match_score)}</p>
      </div>
      <button
        class="rounded-md border border-border px-3 py-1.5 text-sm font-bold"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={`talent-explainability-${talent.id}`}
        onclick={onToggleExplainability}
      >
        {isExpanded
          ? t('workspace.talents.hide_score_details', {}, 'Hide score details')
          : t('workspace.talents.show_score_details', {}, 'Score details')}
      </button>
    </div>
  {/if}

  {#if isExpanded}
    <section
      id={`talent-explainability-${talent.id}`}
      class="mt-3 grid gap-3 rounded-lg border border-border bg-muted/20 p-3"
    >
      <div class="grid gap-2 sm:grid-cols-4">
        {#each explainabilityMetrics as metric}
          <div class="rounded-md border border-border bg-background p-3">
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {metric.label}
            </p>
            <p class="mt-1 text-xl font-black text-foreground">{metric.value}</p>
            <p class="text-xs text-muted-foreground">
              {t('workspace.talents.metric_weight', { weight: metric.weight }, 'weight :weight')}
            </p>
          </div>
        {/each}
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <h3 class="text-sm font-bold text-foreground">
            {t('workspace.talents.explainability_evidence', {}, 'Matched skills, domain, delivery, and trust')}
          </h3>
          {#if (talent.explanations?.length ?? 0) > 0}
            <ul class="mt-2 grid gap-1.5 text-sm text-muted-foreground">
              {#each talent.explanations ?? [] as explanation}
                <li>{explanation}</li>
              {/each}
            </ul>
          {:else}
            <p class="mt-2 text-sm text-muted-foreground">
              {t('workspace.talents.no_explanations', {}, 'No score evidence supplied for this row yet.')}
            </p>
          {/if}
        </div>
        <div>
          <h3 class="text-sm font-bold text-foreground">
            {t('workspace.talents.explainability_risks', {}, 'Risks')}
          </h3>
          {#if (talent.risks?.length ?? 0) > 0}
            <ul class="mt-2 grid gap-1.5 text-sm text-destructive">
              {#each talent.risks ?? [] as risk}
                <li>{risk}</li>
              {/each}
            </ul>
          {:else}
            <p class="mt-2 text-sm text-muted-foreground">
              {t('workspace.talents.no_risks', {}, 'No match risks reported.')}
            </p>
          {/if}
        </div>
      </div>
    </section>
  {/if}
</article>
