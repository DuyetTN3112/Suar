<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import ProjectMemberCard from './project_member_card.svelte'
  import ProjectMemberSetupPreview from './project_member_setup_preview.svelte'
  import type { ProjectMember, ProjectShowProps } from '../types'

  interface ProfessionalRoleOption {
    id: string
    name: string
    code: string
    isActive?: boolean
  }

  interface MemberCandidate {
    userId: string
    username: string
    email: string
    orgRole: string
  }

  interface Props {
    projectId: string
    members: ProjectMember[]
    permissions: ProjectShowProps['permissions']
    projectProfessionalRoles: ProfessionalRoleOption[]
    loadingProjectRoles: boolean
    getMemberInitials: (member: ProjectMember) => string
    onUpdateMemberRole: (userId: string, newRole: string, professionalRoleId?: string | null) => void
    onRemoveMember: (userId: string) => void
  }

  let {
    projectId,
    members,
    permissions,
    projectProfessionalRoles,
    loadingProjectRoles,
    getMemberInitials,
    onUpdateMemberRole,
    onRemoveMember,
  }: Props = $props()

  const { t } = $derived(useTranslation())

  let addMemberOpen = $state(false)
  let memberSearch = $state('')
  let newMemberUserId = $state('')
  let newMemberRole = $state('project_member')
  let newMemberProfessionalRoleId = $state('')
  let loadingCandidates = $state(false)
  let memberCandidates = $state<MemberCandidate[]>([])

  const selectedNewMemberCandidate = $derived(
    memberCandidates.find((candidate) => candidate.userId === newMemberUserId) ?? null
  )
  const selectedNewMemberProfessionalRole = $derived(
    projectProfessionalRoles.find((role) => role.id === newMemberProfessionalRoleId) ?? null
  )

  const membersWithoutDeliveryRole = $derived(
    members.filter((member) => !member.project_professional_role_id)
  )

  async function loadMemberCandidates() {
    loadingCandidates = true
    try {
      const params = new URLSearchParams()
      if (memberSearch.trim()) params.set('search', memberSearch.trim())
      const resp = await fetch(`/projects/${projectId}/member-candidates?${params}`)
      const result = await resp.json() as { data: MemberCandidate[] }
      memberCandidates = result.data
    } catch {
      memberCandidates = []
    } finally {
      loadingCandidates = false
    }
  }

  function handleAddMember(e: Event) {
    e.preventDefault()
    const userId = newMemberUserId.trim()
    if (!userId) return

    router.post(
      '/projects/members',
      {
        projectId,
        userId,
        projectRole: newMemberRole,
        projectProfessionalRoleId: newMemberProfessionalRoleId || null,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          newMemberUserId = ''
          newMemberRole = 'project_member'
          newMemberProfessionalRoleId = ''
          addMemberOpen = false
        },
      }
    )
  }

  $effect(() => {
    if (addMemberOpen && projectId) {
      void loadMemberCandidates()
    }
  })
</script>

<Card>
  <CardHeader class="flex flex-row items-center justify-between">
    <CardTitle>{t('project.members', {}, 'Members')}</CardTitle>
    {#if permissions.isCreator || permissions.isManager}
      <Button size="sm" onclick={() => { addMemberOpen = true }}>
        {t('project.add_member', {}, 'Add Member')}
      </Button>
      <Dialog open={addMemberOpen} onOpenChange={(open: boolean) => { addMemberOpen = open }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('project.add_member', {}, 'Add Member')}</DialogTitle>
          </DialogHeader>
          <form onsubmit={handleAddMember} class="space-y-4">
            <div class="space-y-2">
              <Label for="member_search">{t('project.members_tab.search_label', {}, 'Search organization members')}</Label>
              <Input
                id="member_search"
                type="text"
                value={memberSearch}
                oninput={(event: Event) => {
                  memberSearch = (event.currentTarget as HTMLInputElement).value
                  void loadMemberCandidates()
                }}
                placeholder={t('project.members_tab.search_placeholder', {}, 'Search by name or email...')}
              />
            </div>
            <div class="space-y-2">
              <Label for="user_id">{t('project.members_tab.choose_member_label', {}, 'Choose member')}</Label>
              <select
                id="user_id"
                bind:value={newMemberUserId}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">{t('project.members_tab.choose_member_placeholder', {}, 'Choose member')}</option>
                {#if loadingCandidates}
                  <option disabled>{t('project.members_tab.loading', {}, 'Loading...')}</option>
                {:else}
                  {#each memberCandidates as candidate}
                    <option value={candidate.userId}>
                      {candidate.username} ({candidate.email}) — {candidate.orgRole}
                    </option>
                  {/each}
                  {#if memberCandidates.length === 0}
                    <option disabled>{t('project.members_tab.no_candidates', {}, 'No available members')}</option>
                  {/if}
                {/if}
              </select>
            </div>
            <div class="space-y-2">
              <Label for="project_role">{t('project.members_tab.project_role_label', {}, 'Project role')}</Label>
              <select
                id="project_role"
                bind:value={newMemberRole}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="project_viewer">{t('project.member_card.project_role.project_viewer', {}, 'Viewer')}</option>
                <option value="project_member">{t('project.member_card.project_role.project_member', {}, 'Member')}</option>
                <option value="project_manager">{t('project.member_card.project_role.project_manager', {}, 'Manager')}</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label for="project_professional_role">{t('project.members_tab.delivery_role_label', {}, 'Delivery role')}</Label>
              <select
                id="project_professional_role"
                bind:value={newMemberProfessionalRoleId}
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('project.members_tab.unassigned_delivery_role', {}, 'No delivery role assigned')}</option>
                {#if loadingProjectRoles}
                  <option disabled>{t('project.members_tab.loading_roles', {}, 'Loading roles...')}</option>
                {:else}
                  {#each projectProfessionalRoles as role}
                    <option value={role.id}>{role.name} ({role.code})</option>
                  {/each}
                {/if}
              </select>
              {#if selectedNewMemberProfessionalRole}
                <p class="text-xs text-foreground">
                  {t('project.members_tab.delivery_role_prefix', {}, 'Delivery role')}: <span class="font-medium">{selectedNewMemberProfessionalRole.name}</span>
                </p>
              {/if}
            </div>
            {#if selectedNewMemberCandidate}
              <ProjectMemberSetupPreview
                candidate={selectedNewMemberCandidate}
                governanceRole={newMemberRole}
                deliveryRoleName={selectedNewMemberProfessionalRole?.name ?? null}
              />
            {/if}
            <Button type="submit" disabled={!newMemberUserId}>
              {t('project.members_tab.submit', {}, 'Add')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    {/if}
  </CardHeader>
  <CardContent>
    {#if membersWithoutDeliveryRole.length > 0}
      <div class="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p class="text-sm font-semibold text-foreground">{t('project.members_tab.staffing_clarity', {}, 'Staffing clarity')}</p>
        <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span class="rounded-full bg-card px-2.5 py-1">
            {t('project.members_tab.member_missing_delivery', { count: membersWithoutDeliveryRole.length }, ':count members without delivery role')}
          </span>
        </div>
      </div>
    {/if}
    <div class="grid grid-cols-1 gap-4">
      {#if members.length === 0}
        <p class="col-span-full text-center py-4 text-muted-foreground">
          {t('project.members_tab.empty', {}, 'No members yet')}
        </p>
      {:else}
        {#each members as member, index (`${member.user_id ?? ''}-${index}`)}
          <ProjectMemberCard
            {member}
            canManage={permissions.isCreator || permissions.isManager}
            {projectProfessionalRoles}
            {getMemberInitials}
            onUpdateMemberRole={onUpdateMemberRole}
            onRemoveMember={onRemoveMember}
          />
        {/each}
      {/if}
    </div>
  </CardContent>
</Card>
