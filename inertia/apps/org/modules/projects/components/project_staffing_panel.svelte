<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import ProjectStaffingAutoFillPreviewItem from './project_staffing_auto_fill_preview_item.svelte'
  import ProjectStaffingAutoFillResultItem from './project_staffing_auto_fill_result_item.svelte'
  import { useProjectStaffingStore, type ProjectStaffingStoreProps } from './project_staffing_store.svelte'

  interface Props extends ProjectStaffingStoreProps {
    onOpenMatching: (roleId: string) => void
  }

  const props: Props = $props()
  const store = useProjectStaffingStore(() => props)
  const { t } = useTranslation()
</script>

<Card>
  <CardHeader>
    <CardTitle>{t('project.staffing.title', {}, 'Staffing')}</CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if store.loadingRoleCandidateInsights}
      <p class="text-sm text-muted-foreground">{t('project.staffing.loading_candidates', {}, 'Loading candidates...')}</p>
    {:else if store.roleCandidateInsights.length === 0}
      <div class="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        {t('project.staffing.no_candidate_match', {}, 'No matching candidates yet.')}
      </div>
    {:else}
      <div class="rounded-2xl border border-border bg-secondary/20 p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-foreground">{t('project.staffing.auto_fill_preview', {}, 'Auto-fill preview')}</p>
            <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span class="rounded-full bg-card/80 px-2.5 py-1">
                {t('project.staffing.add_member_summary', { count: store.autoFillSummary.addMemberCount }, ':count new')}
              </span>
              <span class="rounded-full bg-card/80 px-2.5 py-1">
                {t('project.staffing.update_member_summary', { count: store.autoFillSummary.updateMemberCount }, ':count reassigned')}
              </span>
              <span class="rounded-full bg-card/80 px-2.5 py-1">
                {t('project.staffing.skipped_summary', { count: store.autoFillSummary.skippedCount }, ':count skipped without a safe match')}
              </span>
              <span class="rounded-full bg-card/80 px-2.5 py-1">
                {t('project.staffing.excluded_summary', { count: store.autoFillSummary.excludedCount }, ':count excluded from batch')}
              </span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onclick={store.includeAllAutoFillRoles}
              disabled={store.autoFillExcludedRoleIds.length === 0}
            >
              {t('project.staffing.include_all', {}, 'Include all')}
            </Button>
            <Button
              variant="outline"
              onclick={store.excludeAllAutoFillRoles}
              disabled={store.autoFillExcludableRoleIds.length === 0 || store.autoFillReadyCount === 0}
            >
              {t('project.staffing.exclude_all', {}, 'Exclude all')}
            </Button>
            <Button
              onclick={() => { store.autoFillConfirming = true }}
              disabled={store.autoStaffing || store.autoFillReadyCount === 0}
            >
              {store.autoStaffing
                ? t('project.staffing.auto_filling', {}, 'Auto-filling...')
                : t('project.staffing.auto_fill_preparing', { count: store.autoFillReadyCount }, 'Prepare auto-fill for :count roles')}
            </Button>
            <Button variant="outline" onclick={() => props.onOpenMatching('')}>{t('project.staffing.review_each_role', {}, 'Review each role')}</Button>
          </div>
        </div>

        {#if store.autoFillConfirming && store.autoFillReadyCount > 0}
          <div class="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p class="text-sm font-semibold text-foreground">{t('project.staffing.confirm_auto_fill', {}, 'Confirm auto-fill')}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <Button onclick={() => { void store.handleAutoFillTopMatches() }} disabled={store.autoStaffing}>
                {store.autoStaffing
                  ? t('project.staffing.applying_auto_fill', {}, 'Applying...')
                  : t('project.staffing.apply_auto_fill', {}, 'Confirm and apply')}
              </Button>
              <Button variant="outline" onclick={() => { store.autoFillConfirming = false }} disabled={store.autoStaffing}>
                {t('project.staffing.cancel_batch', {}, 'Cancel batch')}
              </Button>
            </div>
          </div>
        {/if}

        {#if store.autoFillPreview.length > 0}
          <div class="mt-4 grid gap-2 lg:grid-cols-2">
            {#each store.autoFillPreview as item (item.roleId)}
              <ProjectStaffingAutoFillPreviewItem {item} onToggle={store.toggleAutoFillRole} />
            {/each}
          </div>
        {/if}

        {#if store.autoFillLastResults.length > 0}
          <div class="mt-4 rounded-2xl border border-border bg-card/70 p-4">
            <p class="text-sm font-semibold text-foreground">{t('project.staffing.last_batch_results', {}, 'Latest batch results')}</p>
            <div class="mt-3 space-y-2 text-sm text-muted-foreground">
              {#each store.autoFillLastResults as result (`${result.roleId}-${result.candidateUsername}`)}
                <ProjectStaffingAutoFillResultItem
                  {result}
                  onRetry={(roleId) => {
                    const target = store.autoFillLastResults.find((item) => item.roleId === roleId)
                    if (target) { void store.handleRetryAutoFillResult(target) }
                  }}
                  onOpenMatching={props.onOpenMatching}
                />
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        {#each store.roleCandidateInsights as insight (insight.roleId)}
          <div class="rounded-2xl border border-border bg-secondary/20 p-4">
            <p class="text-sm font-semibold text-foreground">{insight.roleName}</p>
            <p class="mt-1 text-xs font-mono uppercase tracking-wide text-muted-foreground">{insight.roleCode}</p>
            <div class="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>{t('project.staffing.total_candidates', { count: insight.totalCandidates }, ':count candidates')}</p>
              <p>{t('project.staffing.org_member_candidates', { count: insight.orgMemberCandidates }, ':count outside project')}</p>
              <p>{t('project.staffing.project_member_candidates', { count: insight.projectMemberCandidates }, ':count in project')}</p>
            </div>
            {#if insight.topCandidate}
              <div class="mt-3 rounded-xl border border-primary/10 bg-card/80 p-3 text-sm">
                <p class="font-medium text-foreground">{insight.topCandidate.username}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {insight.topCandidate.matchScore}% ·
                  {t(
                    `ui_misc.projects.staffing.source.${insight.topCandidate.source}`,
                    {},
                    insight.topCandidate.source
                  )}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {t(
                    'ui_misc.projects.staffing.skill_match',
                    {
                      matched: insight.topCandidate.matchedSkills,
                      total: insight.topCandidate.totalRequiredSkills,
                    },
                    ':matched/:total skills'
                  )}
                </p>
                <TalentExplainabilityBadges
                  reviewedSkillsCount={insight.topCandidate.reviewedSkillsCount}
                  importedSkillsCount={insight.topCandidate.importedSkillsCount}
                  underDisputeSkillsCount={insight.topCandidate.underDisputeSkillsCount}
                  latestConfidenceSignal={insight.topCandidate.latestConfidenceSignal}
                  containerClass="mt-2 flex flex-wrap gap-1"
                  badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
                />
                {#if insight.topCandidate.skillGaps.length > 0}
                  <p class="mt-1 text-xs text-muted-foreground">
                    {t(
                      'ui_misc.projects.staffing.skill_gap',
                      { skills: insight.topCandidate.skillGaps.join(', ') },
                      'Gap: :skills'
                    )}
                  </p>
                {/if}
              </div>
            {/if}

            {#if insight.topCandidates.length > 0}
              <div class="mt-3 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('project.staffing.candidate_list', {}, 'List')}</p>
                {#each insight.topCandidates as candidate (`${insight.roleId}-${candidate.userId}`)}
                  {@const isBusy = store.staffingCandidateActionKey === `${insight.roleId}:${candidate.userId}`}
                  <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-foreground">{candidate.username}</p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {candidate.matchScore}% ·
                        {t(
                          `ui_misc.projects.staffing.source.${candidate.source}`,
                          {},
                          candidate.source
                        )}
                      </p>
                      <TalentExplainabilityBadges
                        reviewedSkillsCount={candidate.reviewedSkillsCount}
                        importedSkillsCount={candidate.importedSkillsCount}
                        underDisputeSkillsCount={candidate.underDisputeSkillsCount}
                        latestConfidenceSignal={candidate.latestConfidenceSignal}
                        containerClass="mt-2 flex flex-wrap gap-1"
                        badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
                      />
                    </div>
                    <Button
                      size="sm"
                      onclick={() => { void store.handleAssignCandidate(insight, candidate) }}
                      disabled={candidate.source === 'external' || isBusy}
                    >
                      {isBusy ? t('project.staffing.assigning', {}, 'Assigning...') : t('project.staffing.assign', {}, 'Assign')}
                    </Button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onclick={() => props.onOpenMatching(insight.roleId)}>{t('project.staffing.open_role', {}, 'Open role')}</Button>
              <Button size="sm" variant="outline" onclick={() => router.visit(`/user/talents?project_id=${props.projectId}`)}>
                {t('ui_misc.projects.staffing.talent_pool', {}, 'Talent pool')}
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </CardContent>
</Card>
