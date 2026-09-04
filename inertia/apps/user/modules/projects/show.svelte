<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import axios from 'axios'
import ConfirmDialog from '@/apps/user/shared/components/confirm_dialog.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { formatDate } from '@/apps/user/shared/lib/utils'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'

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
    tasks,
    project_context,
    tasks_summary,
    permissions,
    shellMode = 'app',
    baseRoute = FRONTEND_ROUTES.PROJECTS,
  }: ProjectShowProps = $props()

  const { t } = $derived(useTranslation())
  const safeMembers = $derived(members)
  const memberCount = $derived(safeMembers.length)
  const projectTaskSummary = $derived(tasks_summary ?? {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  })
  let confirmDialogOpen = $state(false)
  let pendingMemberRemovalUserId = $state<string | null>(null)
  let projectProfessionalRoles = $state<ProfessionalRoleOption[]>([])
  let loadingProjectRoles = $state(false)
  let projectRolesHydratedForProjectId = $state<string | null>(null)
  let activeTab = $state<ProjectTab>('details')
  let syncedProjectId = $state<string | null>(null)
  let appliedFocusMode = $state<string | null | undefined>(undefined)
  let editing = $state(false)

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

  const currentQuery = $derived(new URLSearchParams(page.url.split('?')[1] ?? ''))
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
  const staffedProfessionalRoleCount = $derived(
    activeProfessionalRoles.filter((role) => staffedProfessionalRoleIds.includes(role.id)).length
  )
  const membersWithDeliveryRole = $derived(
    safeMembers.filter((member) => typeof member.project_professional_role_id === 'string' && member.project_professional_role_id.length > 0)
  )
  const membersWithoutDeliveryRole = $derived(
    safeMembers.filter((member) => !member.project_professional_role_id)
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
    confirmDialogOpen = true
  }

  function confirmPendingAction() {
    if (!pendingMemberRemovalUserId) return
    router.delete(
      `/projects/members/${pendingMemberRemovalUserId}`,
      {
        data: { projectId: project.id },
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          confirmDialogOpen = false
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

  function setActiveProjectTab(value: string) {
    const nextTab = value as ProjectTab
    activeTab = nextTab
    const params = new URLSearchParams(page.url.split('?')[1] ?? '')
    if (nextTab === 'details') {
      params.delete('focus')
      params.delete('tab')
    } else {
      params.set('focus', nextTab)
      params.delete('tab')
    }
    const query = params.toString()
    router.visit(`${baseRoute}/${project.id}${query ? `?${query}` : ''}`, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }
</script>

<svelte:head>
  <title>{projectState.name}</title>
</svelte:head>

<AppLayout title={projectState.name} workspaceMode="project">
  <div class="space-y-6 p-4 sm:p-6">
    {#if shellMode === 'organization' && unstaffedProfessionalRoles.length > 0}
      <ProjectStaffingPanel
        projectId={project.id}
        members={safeMembers}
        {activeProfessionalRoles}
        {unstaffedProfessionalRoles}
        onOpenMatching={openRoleMatching}
      />
    {/if}

    <Tabs value={activeTab} onValueChange={setActiveProjectTab}>
      <TabsContent value="details" class="mt-4">
        <ProjectDetailsTab
          bind:projectState
          bind:editing
          bind:editForm
          {memberCount}
          {projectTaskSummary}
          {membersWithDeliveryRole}
          {staffedProfessionalRoleCount}
          {activeProfessionalRoles}
          {membersWithoutDeliveryRole}
          {unstaffedProfessionalRoles}
          projectContext={project_context}
          canEdit={permissions.canEdit ?? (permissions.isCreator || permissions.isManager)}
          onProjectContextPublished={() => router.reload({ only: ['project_context'] })}
          onProjectContextConflict={reloadProjectContext}
          {formatDate}
        />
      </TabsContent>

      <TabsContent value="members" class="mt-4">
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
      </TabsContent>

      <TabsContent value="skills" class="mt-4">
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
      </TabsContent>

      <TabsContent value="roles" class="mt-4">
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
      </TabsContent>

      <TabsContent value="operating_model" class="mt-4">
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
      </TabsContent>

      <TabsContent value="sprints" class="mt-4">
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
      </TabsContent>

      <TabsContent value="workflow" class="mt-4">
        <ProjectWorkflowSettings
          projectId={project.id}
          canManage={Boolean(permissions.canEdit ?? (permissions.isCreator || permissions.isManager || permissions.isOwner))}
        />
      </TabsContent>
    </Tabs>
  </div>
</AppLayout>

<ConfirmDialog
  bind:open={confirmDialogOpen}
  title={t('project.show_page.confirm_remove_member_title', {}, 'Remove member from project')}
  desc={t('project.show_page.confirm_remove_member_desc', {}, 'Remove this member from the project?')}
  cancelBtnText={t('project.show_page.cancel', {}, 'Cancel')}
  confirmText={t('project.show_page.confirm', {}, 'Confirm')}
  destructive={true}
  handleConfirm={confirmPendingAction}
/>
