<script lang="ts">
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Candidate {
    userId: string
    username: string
    email: string
    orgRole: string
    reviewedSkillsCount?: number
    importedSkillsCount?: number
    underDisputeSkillsCount?: number
    latestConfidenceSignal?: 'low' | 'medium' | 'high' | null
  }

  interface Props {
    candidate: Candidate
    governanceRole: string
    deliveryRoleName?: string | null
  }

  const { candidate, governanceRole, deliveryRoleName = null }: Props = $props()
  const { t } = useTranslation()
</script>

<div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
  <p class="text-sm font-semibold text-foreground">{t('project.staffing.preview_title', {}, 'Preview')}</p>
  <div class="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('project.staffing.member_label', {}, 'Member')}</p>
      <p class="mt-1 text-foreground">{candidate.username}</p>
      <p class="text-xs text-muted-foreground">{candidate.email}</p>
    </div>
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('project.staffing.permission_label', {}, 'Permission')}</p>
      <p class="mt-1 text-foreground">{governanceRole}</p>
    </div>
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('project.staffing.role_label', {}, 'Role')}</p>
      <p class="mt-1 text-foreground">{deliveryRoleName ?? t('project.staffing.unassigned_role', {}, 'No role assigned')}</p>
    </div>
  </div>

  <TalentExplainabilityBadges
    reviewedSkillsCount={candidate.reviewedSkillsCount ?? 0}
    importedSkillsCount={candidate.importedSkillsCount ?? 0}
    underDisputeSkillsCount={candidate.underDisputeSkillsCount ?? 0}
    latestConfidenceSignal={candidate.latestConfidenceSignal ?? null}
    containerClass="mt-3 flex flex-wrap gap-1"
    badgeClass="border-border bg-card text-[10px] text-foreground"
  />
</div>
