<script lang="ts">
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface AutoFillResultItem {
    roleId: string
    roleName: string
    candidateUserId: string | null
    candidateUsername: string | null
    actionType: 'add_member' | 'update_member' | null
    status: 'success' | 'error'
    errorMessage?: string
    reviewedSkillsCount?: number | null
    importedSkillsCount?: number | null
    underDisputeSkillsCount?: number | null
    latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
    matchedSkills?: number | null
    totalRequiredSkills?: number | null
    skillGaps?: string[]
  }

  interface Props {
    result: AutoFillResultItem
    onRetry: (roleId: string) => void
    onOpenMatching: (roleId: string) => void
  }

  const { result, onRetry, onOpenMatching }: Props = $props()
  const { t } = useTranslation()
</script>

<div class={`rounded-xl border p-3 ${result.status === 'success' ? 'border-border bg-background/80' : 'border-destructive/20 bg-destructive/5'}`}>
  <p>
    <span class="font-medium text-foreground">{result.roleName}</span>:
    {#if result.status === 'success'}
      {result.actionType === 'update_member'
        ? t('project.staffing.result_update', {}, ' reassigned ')
        : t('project.staffing.result_add', {}, ' added ')}
      <span class="font-medium text-foreground">{result.candidateUsername}</span>
    {:else}
      {t('project.staffing.result_error', {}, 'error while applying to')}
      <span class="font-medium text-foreground"> {result.candidateUsername ?? t('project.staffing.selected_candidate', {}, 'selected candidate')}</span>
    {/if}
  </p>

  {#if result.matchedSkills !== null && result.matchedSkills !== undefined && result.totalRequiredSkills}
    <p class="mt-1 text-xs text-muted-foreground">
      {t(
        'ui_misc.projects.staffing.skill_match',
        { matched: result.matchedSkills, total: result.totalRequiredSkills },
        ':matched/:total skills'
      )}
    </p>
  {/if}

  {#if result.reviewedSkillsCount !== null && result.reviewedSkillsCount !== undefined && result.importedSkillsCount !== null && result.importedSkillsCount !== undefined}
    <TalentExplainabilityBadges
      reviewedSkillsCount={result.reviewedSkillsCount}
      importedSkillsCount={result.importedSkillsCount}
      underDisputeSkillsCount={result.underDisputeSkillsCount ?? 0}
      latestConfidenceSignal={result.latestConfidenceSignal ?? null}
      containerClass="mt-2 flex flex-wrap gap-1"
      badgeClass="border-border bg-card text-[10px] text-foreground"
    />
  {/if}

  {#if (result.skillGaps?.length ?? 0) > 0}
    <p class="mt-1 text-xs text-muted-foreground">
      {t(
        'ui_misc.projects.staffing.skill_gap',
        { skills: result.skillGaps?.join(', ') ?? '' },
        'Gap: :skills'
      )}
    </p>
  {/if}

  {#if result.status === 'error' && result.errorMessage}
    <p class="mt-1 text-xs text-destructive">{result.errorMessage}</p>
    <div class="mt-2 flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          onRetry(result.roleId)
        }}
      >
        {t('project.staffing.retry', {}, 'Retry')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          onOpenMatching(result.roleId)
        }}
      >
        {t('project.staffing.choose_manually', {}, 'Choose manually')}
      </Button>
    </div>
  {/if}
</div>
