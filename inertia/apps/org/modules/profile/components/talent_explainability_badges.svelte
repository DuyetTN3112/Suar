<script lang="ts">
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import {
    formatTalentConfidenceLabel,
    formatTalentCoverageLabel,
    formatTalentGovernanceLabel,
  } from '@/apps/org/modules/talents/talent_explainability'

  interface Props {
    reviewedSkillsCount?: number
    importedSkillsCount?: number
    underDisputeSkillsCount?: number
    latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
    containerClass?: string
    badgeClass?: string
  }

  const {
    reviewedSkillsCount,
    importedSkillsCount,
    underDisputeSkillsCount,
    latestConfidenceSignal,
    containerClass = 'flex flex-wrap gap-1.5 pt-1',
    badgeClass = 'border-border bg-card text-[10px] text-foreground',
  }: Props = $props()
</script>

<div class={containerClass}>
  <Badge variant="outline" class={badgeClass}>
    {formatTalentCoverageLabel(reviewedSkillsCount, importedSkillsCount)}
  </Badge>

  {#if formatTalentConfidenceLabel(latestConfidenceSignal)}
    <Badge variant="outline" class={badgeClass}>
      {formatTalentConfidenceLabel(latestConfidenceSignal)}
    </Badge>
  {/if}

  {#if formatTalentGovernanceLabel(underDisputeSkillsCount)}
    <Badge variant="outline" class={badgeClass}>
      {formatTalentGovernanceLabel(underDisputeSkillsCount)}
    </Badge>
  {/if}
</div>
