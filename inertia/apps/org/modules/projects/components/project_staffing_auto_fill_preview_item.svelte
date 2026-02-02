<script lang="ts">
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface RoleCandidateSummary {
    userId: string
    username: string
    source: 'project_member' | 'org_member' | 'external'
    matchScore: number
    matchedSkills: number
    totalRequiredSkills: number
    skillGaps: string[]
    reviewedSkillsCount: number
    importedSkillsCount: number
    underDisputeSkillsCount: number
    latestConfidenceSignal: 'low' | 'medium' | 'high' | null
  }

  interface AutoFillPreviewItem {
    roleId: string
    roleName: string
    candidate: RoleCandidateSummary | null
    excluded: boolean
    actionType: 'add_member' | 'update_member' | null
  }

  interface Props {
    item: AutoFillPreviewItem
    onToggle: (roleId: string) => void
  }

  const { item, onToggle }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="rounded-xl border border-border bg-card/80 p-3 text-sm">
  <div class="flex items-start justify-between gap-3">
    <p class="font-medium text-foreground">{item.roleName}</p>
    <Button
      size="sm"
      variant="outline"
      onclick={() => {
        onToggle(item.roleId)
      }}
    >
      {item.excluded
        ? t('project.staffing.restore_to_batch', {}, 'Restore')
        : t('project.staffing.exclude_from_batch', {}, 'Exclude from batch')}
    </Button>
  </div>

  {#if item.candidate}
    <p class="mt-1 text-muted-foreground">
      {item.actionType === 'update_member'
        ? t('project.staffing.action_update', {}, 'Update')
        : t('project.staffing.action_add', {}, 'Add')}
      <span class="font-medium text-foreground"> {item.candidate.username}</span>
      · {item.candidate.matchScore}% ·
      {t(
        `ui_misc.projects.staffing.source.${item.candidate.source}`,
        {},
        item.candidate.source
      )}
    </p>
    <p class="mt-1 text-xs text-muted-foreground">
      {t(
        'ui_misc.projects.staffing.skill_match',
        {
          matched: item.candidate.matchedSkills,
          total: item.candidate.totalRequiredSkills,
        },
        ':matched/:total skills'
      )}
    </p>
    <TalentExplainabilityBadges
      reviewedSkillsCount={item.candidate.reviewedSkillsCount}
      importedSkillsCount={item.candidate.importedSkillsCount}
      underDisputeSkillsCount={item.candidate.underDisputeSkillsCount}
      latestConfidenceSignal={item.candidate.latestConfidenceSignal}
      containerClass="mt-2 flex flex-wrap gap-1"
      badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
    />
    {#if item.candidate.skillGaps.length > 0}
      <p class="mt-1 text-xs text-muted-foreground">
        {t(
          'ui_misc.projects.staffing.skill_gap',
          { skills: item.candidate.skillGaps.join(', ') },
          'Gap: :skills'
        )}
      </p>
    {/if}
  {:else}
    <p class="mt-1 text-muted-foreground">{t('project.staffing.no_candidate', {}, 'No candidate yet.')}</p>
  {/if}

  {#if item.excluded}
    <p class="mt-1 text-xs text-muted-foreground">{t('project.staffing.excluded_from_batch', {}, 'Excluded from batch.')}</p>
  {/if}
</div>
