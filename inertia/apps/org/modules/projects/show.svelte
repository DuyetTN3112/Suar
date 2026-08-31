<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'

  import ConfirmDialog from '@/apps/org/shared/components/confirm_dialog.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import { resolveBrowserCurrentUrl } from '@/apps/org/shared/components/navigation_helpers'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { formatDate } from '@/apps/org/shared/lib/utils'
  import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  import ProjectDetailsTab from './components/project_details_tab.svelte'
  import ProjectMembersTab from './components/project_members_tab.svelte'
  import ProjectStaffingPanel from './components/project_staffing_panel.svelte'
  import ProjectRolesTab from './components/project_roles_tab.svelte'
  import ProjectSkillsTab from './components/project_skills_tab.svelte'
  import ProjectSprintPanel from './components/project_sprint_panel.svelte'
  import ProjectOperatingModelTab from './components/project_operating_model_tab.svelte'
  import ProjectWorkflowSettings from '@/apps/shared/tasks/project_workflow_settings.svelte'
  import type { ProjectMember, ProjectShowProps } from './types'

  type ProjectTab = 'details' | 'members' | 'skills' | 'roles' | 'operating_model' | 'sprints' | 'workflow'

  interface ProfessionalRoleOption {
    id: string
    name: string
    code: string
    isActive?: boolean
  }

  interface ProjectContextReloadCallbacks {
    onSuccess: () => void
    onError: () => void
  }

  const {
    project,
    members,
    project_context,
    permissions,
    shellMode = 'app',
    baseRoute = FRONTEND_ROUTES.PROJECTS,
  }: ProjectShowProps = $props()

  const { t } = $derived(useTranslation())
  const safeMembers = $derived(members)

  let confirmDialogOpen = $state(false)
  let confirmAction = $state<'delete_project' | 'remove_member' | null>(null)
  let pendingMemberRemovalUserId = $state<string | null>(null)
  let projectProfessionalRoles = $state<ProfessionalRoleOption[]>([])
  let loadingProjectRoles = $state(false)
  let projectRolesHydratedForProjectId = $state<string | null>(null)
  let activeTab = $state<ProjectTab>('details')
  let syncedProjectId = $state<string | null>(null)
  let appliedFocusMode = $state<string | null | undefined>(undefined)
  let editing = $state(false)
  let saving = $state(false)
  let deleting = $state(false)

  let projectState = $state<ProjectShowProps['project']>({
    id: '',
    name: '',
    organization_id: '',
    creator_id: '',
    created_at: '',
    updated_at: '',
    description: '',
    organization_name: '',
    creator_name: '',
    manager_id: '',
    manager_name: '',
    start_date: '',
    end_date: '',
    status: 'pending',
    visibility: 'team',
  })

  let editForm = $state({
    name: '',
    description: '',
    status: 'pending',
    businessDomains: [] as string[],
  })

  const currentUrl = $derived(resolveBrowserCurrentUrl(page.url))
  const currentQuery = $derived(new URLSearchParams(currentUrl.split('?')[1] ?? ''))
  const focusMode = $derived(currentQuery.get('focus') ?? currentQuery.get('tab'))
  const activeProfessionalRoles = $derived(projectProfessionalRoles.filter((role) => role.isActive !== false))

  function reloadProjectContext({ onSuccess, onError }: ProjectContextReloadCallbacks): void {
    router.reload({
      only: ['project_context'],
      onSuccess,
      onError: () => onError(),
    })
  }
  const staffedProfessionalRoleIds = $derived(
    [...new Set(
      safeMembers
        .map((member) => member.project_professional_role_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    )]
  )
  const unstaffedProfessionalRoles = $derived(
    activeProfessionalRoles.filter((role) => !staffedProfessionalRoleIds.includes(role.id))
  )

  let candidateFocusRoleId = $state<string | null>(null)
  let candidateFocusKey = $state<string | null>(null)

  $effect(() => {
    if (project.id && syncedProjectId !== project.id) {
      projectState = { ...project }
      syncedProjectId = project.id
    }
  })

  $effect(() => {
    if (!editing) {
      editForm.name = projectState.name
      editForm.description = projectState.description ?? ''
      editForm.status = projectState.status ?? 'pending'
      editForm.businessDomains = projectState.business_domains ?? []
    }
  })

  $effect(() => {
    if (appliedFocusMode !== focusMode) {
      appliedFocusMode = focusMode
      let nextTab: ProjectTab = 'details'
      if (focusMode === 'members') nextTab = 'members'
      else if (focusMode === 'skills') nextTab = 'skills'
      else if (focusMode === 'roles') nextTab = 'roles'
      else if (focusMode === 'operating_model') nextTab = 'operating_model'
      else if (focusMode === 'sprints') nextTab = 'sprints'
      else if (focusMode === 'workflow') nextTab = 'workflow'
      activeTab = nextTab
    }
  })

  $effect(() => {
    if (project.id && projectRolesHydratedForProjectId !== project.id && !loadingProjectRoles) {
      void loadProjectProfessionalRoles()
    }
  })

  async function loadProjectProfessionalRoles() {
    if (!project.id) {
      projectProfessionalRoles = []
      return
    }
    loadingProjectRoles = true
    try {
      const response = await axios.get<{ data: ProfessionalRoleOption[] }>(
        `/api/v1/projects/${project.id}/professional-roles`
      )
      projectProfessionalRoles = response.data.data.filter((role) => role.isActive !== false)
    } catch {
      projectProfessionalRoles = []
    } finally {
      projectRolesHydratedForProjectId = project.id
      loadingProjectRoles = false
    }
  }

  function getMemberInitials(member: ProjectMember): string {
    const fromUsername = member.username ? member.username.charAt(0).toUpperCase() : ''
    const fromEmail = member.email ? member.email.charAt(0).toUpperCase() : ''
    return fromUsername || fromEmail || '?'
  }

  async function handleDeleteProject() {
    deleting = true
    try {
      await axios.delete(`/api/v1/projects/${project.id}`)
      confirmDialogOpen = false
      confirmAction = null
      router.visit(baseRoute)
    } catch {
      notificationStore.error(t('project.show_page.delete_error', {}, 'Unable to delete project'))
    } finally {
      deleting = false
    }
  }

  async function handleSaveProject() {
    if (!editForm.name.trim()) {
      notificationStore.error(t('project.show_page.name_required', {}, 'Project name is required'))
      return
    }
    saving = true
    try {
      await axios.patch(`/api/v1/projects/${project.id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || null,
        status: editForm.status,
        business_domains: editForm.businessDomains,
      })
      projectState = {
        ...projectState,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        status: editForm.status,
        business_domains: editForm.businessDomains,
      }
      editing = false
      notificationStore.success(t('project.show_page.update_success', {}, 'Project updated'))
    } catch {
      notificationStore.error(t('project.show_page.update_error', {}, 'Unable to update project'))
    } finally {
      saving = false
    }
  }

  function handleUpdateMemberRole(userId: string, newRole: string, professionalRoleId?: string | null) {
    router.put(
      `/projects/members/${userId}`,
      {
        projectId: project.id,
        projectRole: newRole,
        projectProfessionalRoleId: professionalRoleId ?? null,
      },
      { preserveState: true, preserveScroll: true }
    )
  }

  function handleRemoveMember(userId: string) {
    pendingMemberRemovalUserId = userId
    confirmAction = 'remove_member'
    confirmDialogOpen = true
  }

  function requestDeleteProject() {
    confirmAction = 'delete_project'
    confirmDialogOpen = true
  }

  function confirmPendingAction() {
    if (confirmAction === 'delete_project') {
      void handleDeleteProject()
      return
    }
    if (!pendingMemberRemovalUserId) return
    router.delete(
      `/projects/members/${pendingMemberRemovalUserId}`,
      {
        data: { projectId: project.id },
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          confirmDialogOpen = false
          confirmAction = null
          pendingMemberRemovalUserId = null
        },
      }
    )
  }

  function openRoleMatching(roleId: string) {
    activeTab = 'roles'
    if (roleId) {
      candidateFocusRoleId = roleId
      candidateFocusKey = `${roleId}:${Date.now()}`
    }
  }

</script>

<svelte:head>
  <title>{projectState.name}</title>
</svelte:head>

<OrganizationLayout title={projectState.name}>
  <div class="space-y-6 p-4 sm:p-6">
    <div class="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-suar-xs sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
          {shellMode === 'organization' ? t('project.show_page.shell_org_detail', {}, 'Org project detail') : t('project.show_page.shell_user_detail', {}, 'User project detail')}
        </p>
        <h1 class="mt-2 truncate text-3xl font-black tracking-tight sm:text-4xl">{projectState.name}</h1>
        <p class="mt-2 text-sm text-muted-foreground">{projectState.organization_name}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        {#if activeTab === 'details'}
          {#if permissions.canEdit}
            {#if editing}
              <Button variant="outline" onclick={() => { editing = false }} disabled={saving || deleting}>
                {t('project.show_page.cancel_edit', {}, 'Cancel edit')}
              </Button>
              <Button onclick={() => { void handleSaveProject() }} disabled={saving || deleting}>
                {saving ? t('project.show_page.saving', {}, 'Saving...') : t('project.show_page.save', {}, 'Save')}
              </Button>
            {:else}
              <Button variant="outline" onclick={() => { editing = true }} disabled={deleting}>
                {t('project.show_page.edit', {}, 'Edit')}
              </Button>
            {/if}
          {/if}
          {#if permissions.canDelete}
            <Button variant="destructive" onclick={requestDeleteProject} disabled={deleting || saving}>
              {t('project.show_page.delete', {}, 'Delete')}
            </Button>
          {/if}
        {/if}
      </div>
    </div>

    {#if activeTab === 'details'}
      <ProjectDetailsTab
        bind:projectState
        bind:editing
        bind:editForm
        projectContext={project_context}
        canEdit={permissions.canEdit ?? (permissions.isOwner || permissions.isManager || permissions.isCreator)}
        onProjectContextPublished={() => router.reload({ only: ['project_context'] })}
        onProjectContextConflict={reloadProjectContext}
        {formatDate}
      />
    {:else if activeTab === 'members'}
      <ProjectMembersTab
        projectId={project.id}
        members={safeMembers}
        {permissions}
        {projectProfessionalRoles}
        {loadingProjectRoles}
        {getMemberInitials}
        onUpdateMemberRole={handleUpdateMemberRole}
        onRemoveMember={handleRemoveMember}
      />
    {:else if activeTab === 'skills'}
      <Card>
        <CardHeader>
          <CardTitle>{t('project.show_page.tab_skills', {}, 'Skills')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectSkillsTab
            projectId={project.id}
            canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
          />
        </CardContent>
      </Card>
    {:else if activeTab === 'roles'}
      <Card>
        <CardHeader>
          <CardTitle>{t('project.show_page.tab_roles', {}, 'Roles')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectRolesTab
            projectId={project.id}
            canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
              taskLaunchBaseUrl={`/projects/${encodeURIComponent(project.id)}/tasks`}
            {candidateFocusRoleId}
            {candidateFocusKey}
            projectMembers={safeMembers.map((member) => ({
              userId: member.user_id ?? null,
              role: member.role ?? null,
              professionalRoleName: member.professional_role_name ?? null,
            }))}
          />
        </CardContent>
      </Card>
      {#if shellMode === 'organization' && unstaffedProfessionalRoles.length > 0}
        <ProjectStaffingPanel
          projectId={project.id}
          members={safeMembers}
          {activeProfessionalRoles}
          {unstaffedProfessionalRoles}
          onOpenMatching={openRoleMatching}
        />
      {/if}
    {:else if activeTab === 'operating_model'}
      <Card>
        <CardHeader>
          <CardTitle>{t('project.show_page.operating_model_title', {}, 'Operating Model')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectOperatingModelTab
            projectId={project.id}
              taskLaunchBaseUrl={`/projects/${encodeURIComponent(project.id)}/tasks`}
            roles={activeProfessionalRoles}
            canLaunchTask={permissions.canEdit || permissions.isOwner || permissions.isManager}
          />
        </CardContent>
      </Card>
    {:else if activeTab === 'sprints'}
      <section class="space-y-4" aria-label={t('project.show_page.sprint_section_label', {}, 'Project sprints')}>
        <div class="border-b border-border pb-4">
          <p class="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">{t('project.show_page.sprint_eyebrow', {}, 'Project management')}</p>
          <h2 class="mt-1 text-3xl font-black text-foreground">{t('project.show_page.sprint_title', {}, 'Project sprints')}</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            {t('project.show_page.sprint_desc', {}, 'End the current sprint, open post-sprint review, and move to the next sprint.')}
          </p>
        </div>
        <ProjectSprintPanel
          projectId={project.id}
          canManage={permissions.canEdit ?? (permissions.isOwner || permissions.isManager || permissions.isCreator)}
        />
      </section>
    {:else if activeTab === 'workflow'}
      <ProjectWorkflowSettings
        projectId={project.id}
        canManage={Boolean(permissions.canEdit ?? (permissions.isCreator || permissions.isManager || permissions.isOwner))}
      />
    {/if}
  </div>
</OrganizationLayout>

<ConfirmDialog
  bind:open={confirmDialogOpen}
  title={confirmAction === 'delete_project' ? t('project.show_page.confirm_delete_project_title', {}, 'Delete project') : t('project.show_page.confirm_remove_member_title', {}, 'Remove member from project')}
  desc={
    confirmAction === 'delete_project'
      ? t('project.show_page.confirm_delete_project_desc', {}, 'Delete this project? This action cannot be undone.')
      : t('project.show_page.confirm_remove_member_desc', {}, 'Remove this member from the project?')
  }
  cancelBtnText={t('project.show_page.cancel', {}, 'Cancel')}
  confirmText={t('project.show_page.confirm', {}, 'Confirm')}
  destructive={true}
  handleConfirm={confirmPendingAction}
  isLoading={deleting}
/>
