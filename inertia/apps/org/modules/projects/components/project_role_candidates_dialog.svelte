<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle, Users, Check, CircleAlert } from 'lucide-svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import TalentExplainabilityBadges from '@/apps/org/modules/profile/components/talent_explainability_badges.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface StaffingCandidate {
    userId: string
    username: string
    email: string
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

  interface Props {
    projectId: string
    roleId: string
    roleName: string
    projectMembers: {
      userId?: string | null
      role?: string | null
      professionalRoleName?: string | null
    }[]
    open: boolean
    onStaffSuccess: () => void
  }

  let {
    projectId,
    roleId,
    roleName,
    projectMembers,
    open = $bindable(),
    onStaffSuccess,
  }: Props = $props()

  let matchingCandidates = $state<StaffingCandidate[]>([])
  let loadingCandidates = $state(false)
  let staffingCandidateId = $state<string | null>(null)
  const { t } = useTranslation()

  $effect(() => {
    if (open && roleId) {
      void loadCandidates()
    }
  })

  async function loadCandidates() {
    loadingCandidates = true
    try {
      const res = await axios.get<{ data: { candidates: StaffingCandidate[] } }>(
        `/api/v1/projects/${projectId}/professional-roles/${roleId}/candidates`
      )
      matchingCandidates = res.data.data.candidates
    } catch {
      uiToast.error(t('project.role_candidates.load_error', {}, 'Unable to load recommended candidates'))
      matchingCandidates = []
    } finally {
      loadingCandidates = false
    }
  }

  async function handleStaffCandidate(candidate: StaffingCandidate) {
    staffingCandidateId = candidate.userId
    try {
      const existingProjectMember = projectMembers.find((member) => member.userId === candidate.userId)

      if (candidate.source === 'project_member' && existingProjectMember?.userId) {
        await axios.put(`/projects/members/${existingProjectMember.userId}`, {
          projectId,
          projectRole: existingProjectMember.role ?? 'project_member',
          projectProfessionalRoleId: roleId,
        })
        uiToast.success(t('project.role_candidates.assign_success', { user: candidate.username, role: roleName }, ':user assigned to role :role'))
      } else {
        await axios.post('/projects/members', {
          projectId,
          userId: candidate.userId,
          projectRole: 'project_member',
          projectProfessionalRoleId: roleId,
        })
        uiToast.success(t('project.role_candidates.add_success', { user: candidate.username, role: roleName }, ':user added to project with role :role'))
      }

      await loadCandidates()
      onStaffSuccess()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      uiToast.error(error.response?.data?.message ?? t('project.role_candidates.add_error', {}, 'Unable to add candidate'))
    } finally {
      staffingCandidateId = null
    }
  }
</script>

{#if open}
  <Dialog bind:open={open}>
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="text-lg font-semibold text-foreground">
          {t('project.role_candidates.title', { role: roleName }, 'Matching candidates for role: :role')}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 pt-2">
        {#if loadingCandidates}
          <div class="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <LoaderCircle class="h-5 w-5 animate-spin" />
            <span class="text-sm">{t('project.role_candidates.loading', {}, 'Loading candidates...')}</span>
          </div>
        {:else if matchingCandidates.length === 0}
          <div class="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <div class="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Users class="h-5 w-5 text-muted-foreground" />
            </div>
            <p class="text-sm">{t('project.role_candidates.empty', {}, 'No matching candidates yet.')}</p>
          </div>
        {:else}
          <div class="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {#each matchingCandidates as c}
              <div class="flex items-center justify-between gap-4 p-3 rounded-lg border border-border bg-card shadow-sm hover:border-primary/50 transition-colors">
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-foreground text-sm">{c.username}</span>
                    <span class="text-xs text-slate-400 font-mono truncate">{c.email}</span>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-muted-foreground">
                    <div class="flex items-center gap-1">
                      <span class="font-mono font-bold text-primary">{c.matchScore}%</span>
                    </div>
                    <span>•</span>
                    <div>{c.matchedSkills}/{c.totalRequiredSkills} skill</div>
                  </div>
                  <TalentExplainabilityBadges
                    reviewedSkillsCount={c.reviewedSkillsCount}
                    importedSkillsCount={c.importedSkillsCount}
                    underDisputeSkillsCount={c.underDisputeSkillsCount}
                    latestConfidenceSignal={c.latestConfidenceSignal}
                    containerClass="flex flex-wrap gap-1"
                    badgeClass="border-border bg-secondary/20 text-[10px] text-foreground"
                  />
                  {#if c.skillGaps.length > 0}
                    <div class="text-[11px] text-destructive flex items-center gap-1">
                      <CircleAlert class="h-3 w-3 shrink-0" />
                      <span>{t('project.role_candidates.missing_skills', { skills: c.skillGaps.join(', ') }, 'Missing: :skills')}</span>
                    </div>
                  {/if}
                </div>

                <div class="shrink-0">
                  <Button
                    size="sm"
                    class="h-8 text-xs font-medium px-3 gap-1 bg-primary hover:bg-primary/90 text-white"
                    onclick={() => handleStaffCandidate(c)}
                    disabled={c.source === 'external' || staffingCandidateId === c.userId}
                  >
                    {#if staffingCandidateId === c.userId}
                      <LoaderCircle class="h-3 w-3 animate-spin" />
                    {:else if c.source === 'project_member'}
                      <Check class="h-3 w-3" />
                    {/if}
                    {c.source === 'project_member'
                      ? t('project.role_candidates.assign_role', {}, 'Assign this role')
                      : t('project.role_candidates.choose_and_add', {}, 'Choose and add')}
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onclick={() => { open = false }}>{t('project.role_candidates.close', {}, 'Close')}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
{/if}
