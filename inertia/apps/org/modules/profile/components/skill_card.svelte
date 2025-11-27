<script lang="ts">
  /**
   * SkillCard — displays a single user skill with level, score, and review count.
   */
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'
  import { getProfileCategoryLabel } from '@/apps/org/modules/profile/profile_theme'

  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    skill: UserSkillResult
    proficiencyLevels?: ProficiencyLevelOption[]
    onEdit?: (skill: UserSkillResult) => void
    onRemove?: (skill: UserSkillResult) => void
    editable?: boolean
  }

  const { skill, proficiencyLevels = [], onEdit, onRemove, editable = false }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
    })
  )

  const levelInfo = $derived(
    proficiencyLevels.find((l) => l.value === skill.verified_public_proficiency_code) ??
      findFrontendCanonicalProficiencyLevelOption(skill.verified_public_proficiency_code)
  )

  const lastReviewed = $derived(
    skill.last_reviewed_at
      ? dateFormatter.format(new Date(skill.last_reviewed_at))
      : null
  )

  const scoreText = $derived(() => {
    const raw = skill.avg_percentage
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return null
    }
    return `${raw.toFixed(1)}%`
  })

  function categoryLabel(categoryCode: string): string {
    return t(
      `user.profile_categories.${categoryCode}`,
      {},
      getProfileCategoryLabel(categoryCode)
    )
  }

  function proficiencyLabel(levelCode: string | null | undefined): string {
    const option = findFrontendCanonicalProficiencyLevelOption(levelCode)
    if (!option) {
      return levelCode ?? t('user.profile_skills.score_unreviewed', {}, 'Not reviewed')
    }

    return t(`user.proficiency_levels.labels.${option.value}`, {}, option.label)
  }

  function formatEvidenceDate(value: string | null): string {
    return value
      ? dateFormatter.format(new Date(value))
      : t('user.profile_skills.unknown_date', {}, 'Unknown date')
  }
</script>

<div class="rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow">
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <h4 class="text-sm font-medium truncate">{skill.skill_name}</h4>
      <span class="text-[10px] text-muted-foreground">
        {categoryLabel(skill.category_code)}
      </span>
    </div>
    {#if levelInfo}
      <Badge variant="outline" class="shrink-0 text-[10px]" style="border-color: {levelInfo.colorHex}; color: {levelInfo.colorHex}">
        {proficiencyLabel(levelInfo.value)}
      </Badge>
    {:else}
      <Badge variant="outline" class="shrink-0 text-[10px] capitalize">
        {proficiencyLabel(skill.verified_public_proficiency_code)}
      </Badge>
    {/if}
  </div>

    <div class="flex items-center gap-3 text-xs text-muted-foreground">
    {#if scoreText()}
      <span>{t('user.profile_skills.score_label', {}, 'Score')}: {scoreText()}</span>
    {:else}
      <span>{t('user.profile_skills.score_label', {}, 'Score')}: {t('user.profile_skills.score_na', {}, 'N/A')}</span>
    {/if}
    <span>{t('user.profile_skills.review_count', { count: skill.total_reviews }, ':count reviews')}</span>
    {#if lastReviewed}
      <span>{t('user.profile_skills.last_reviewed_label', {}, 'Last reviewed')}: {lastReviewed}</span>
    {/if}
  </div>

  {#if skill.evidence_history.length > 0}
    <div class="rounded-md border border-dashed bg-muted/20 p-2 text-[11px]">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="font-semibold text-foreground">{t('user.profile_skills.evidence_history', {}, 'Evidence history')}</span>
        <span class="text-muted-foreground">{t('user.profile_skills.source_count', { count: skill.evidence_count }, ':count sources')}</span>
      </div>
      <div class="space-y-1.5">
        {#each skill.evidence_history as item}
          <div>
            <div class="flex flex-wrap items-center gap-1 text-muted-foreground">
              <span class="font-medium text-foreground">{item.task_title}</span>
              <span>· {formatEvidenceDate(item.completed_at)}</span>
              {#if item.reviewer_type}
                <span>· {item.reviewer_type}</span>
              {/if}
              {#if item.assigned_public_proficiency_code}
                <span>· {proficiencyLabel(item.assigned_public_proficiency_code)}</span>
              {/if}
            </div>
            {#if item.comment}
              <p class="line-clamp-2 text-muted-foreground">{item.comment}</p>
            {/if}
            {#if item.evidence_links.length > 0}
              <div class="mt-0.5 flex flex-wrap gap-1">
                {#each item.evidence_links.slice(0, 2) as link}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    class="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground hover:underline"
                  >
                    {link.title ?? link.evidence_type}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else if skill.total_reviews > 0}
    <div class="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
      {t('user.profile_skills.aggregate_no_snapshot', {}, 'Aggregate review exists, but no work-history evidence snapshot yet.')}
    </div>
  {/if}

  {#if editable}
    <div class="flex items-center gap-2 pt-1">
      <button
        type="button"
        class="text-xs text-primary hover:underline"
        onclick={() => onEdit?.(skill)}
      >
        {t('user.profile_skills.edit', {}, 'Edit')}
      </button>
      <button
        type="button"
        class="text-xs text-destructive hover:underline"
        onclick={() => onRemove?.(skill)}
      >
        {t('user.profile_skills.remove', {}, 'Remove')}
      </button>
    </div>
  {/if}
</div>
