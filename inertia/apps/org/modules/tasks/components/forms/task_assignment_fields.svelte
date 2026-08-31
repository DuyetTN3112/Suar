<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import TaskAssigneeScopeSelects from '@/apps/org/modules/tasks/components/shared/task_assignee_scope_selects.svelte'
  import {
    shouldResetAssignedToForVisibility,
    type AssigneeGroups,
  } from '@/apps/org/modules/tasks/lib/task_assignee_scope'
  import {
    getOrganizationScopeLabel,
    TASK_VISIBILITY_OPTIONS,
    getTaskVisibilityMarketplaceRule,
    getProjectVisibilityLabel,
    getTaskVisibilityAssignmentRule,
    getTaskVisibilityDescription,
    getTaskVisibilityLabel,
  } from '@/apps/org/modules/tasks/lib/rules/task_visibility'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface ProjectOption {
    id: string
    name: string
  }

  interface UserOption {
    id: string
    username: string
    email: string
  }

  interface ParentTaskOption {
    id: string
    title: string
    task_status_id: string | null
  }

  interface ProjectDetailMemberRecord {
    userId: string
    username: string
    email: string
    role: string
  }

  interface ProjectDetailApiResponse {
    data?: {
      project?: {
        visibility?: string | null
      }
      members?: ProjectDetailMemberRecord[]
    }
  }

  interface ProjectMemberCandidateResponse {
    data?: {
      userId: string
      username: string
      email: string
      orgRole: string
    }[]
  }

  interface Props {
    formData: {
      project_id: string
      assigned_to: string
      parent_task_id: string
      task_visibility: 'project' | 'internal' | 'external' | 'all'
    }
    projects?: ProjectOption[]
    users: UserOption[]
    parentTasks?: ParentTaskOption[]
    taskId: string
    canAssign: boolean
    projectError?: string
    showProjectContext?: boolean
    onSelectChange: (name: string, value: string) => void
  }

  const {
    formData,
    projects = [],
    users,
    parentTasks = [],
    taskId,
    canAssign,
    projectError,
    showProjectContext = true,
    onSelectChange,
  }: Props = $props()

  const { t } = useTranslation()
  let selectedProjectVisibility = $state<string | null>(null)
  let assigneeGroups = $state<AssigneeGroups>({
    projectMembers: [] as {
      id: string
      username: string
      email: string
    }[],
    orgMembersOutsideProject: [] as {
      id: string
      username: string
      email: string
    }[],
  })
  let assigneeGroupRequestKey = $state(0)

  const selectedProject = $derived(
    projects.find((project) => project.id === formData.project_id) ?? null
  )
  const selectedAssignee = $derived(users.find((user) => user.id === formData.assigned_to) ?? null)
  const projectMemberIds = $derived(new Set(assigneeGroups.projectMembers.map((member) => member.id)))
  const orgOutsideProjectIds = $derived(new Set(assigneeGroups.orgMembersOutsideProject.map((member) => member.id)))
  const fallbackUsers = $derived(
    users.filter((user) => !projectMemberIds.has(user.id) && !orgOutsideProjectIds.has(user.id))
  )
  const selectedAssigneeScope = $derived.by(() => {
    if (!formData.assigned_to) return t('task.assignment_fields.scope.unassigned', {}, 'Unassigned')
    if (projectMemberIds.has(formData.assigned_to)) return t('task.assignment_fields.scope.project_member', {}, 'In project')
    if (orgOutsideProjectIds.has(formData.assigned_to)) {
      return t('task.assignment_fields.scope.org_member_outside_project', {}, 'In organization, outside project')
    }
    return t('task.assignment_fields.scope.external_contributor', {}, 'External contributor')
  })

  $effect(() => {
    const projectId = formData.project_id
    if (!projectId) {
      selectedProjectVisibility = null
      assigneeGroups = {
        projectMembers: [],
        orgMembersOutsideProject: [],
      }
      return
    }

    const requestKey = assigneeGroupRequestKey + 1
    assigneeGroupRequestKey = requestKey

    Promise.all([
      fetch(`/api/v1/projects/${projectId}`).then((response) => response.json() as Promise<ProjectDetailApiResponse>),
      fetch(`/projects/${projectId}/member-candidates`).then((response) => response.json() as Promise<ProjectMemberCandidateResponse>),
    ])
      .then(([projectPayload, candidatePayload]) => {
        if (requestKey !== assigneeGroupRequestKey) return

        selectedProjectVisibility = projectPayload.data?.project?.visibility ?? null
        assigneeGroups = {
          projectMembers: (projectPayload.data?.members ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
          })),
          orgMembersOutsideProject: (candidatePayload.data ?? []).map((member) => ({
            id: member.userId,
            username: member.username,
            email: member.email,
          })),
        }
      })
      .catch(() => {
        if (requestKey !== assigneeGroupRequestKey) return
        selectedProjectVisibility = null
        assigneeGroups = {
          projectMembers: [],
          orgMembersOutsideProject: [],
        }
      })
  })

  $effect(() => {
    if (
      shouldResetAssignedToForVisibility(
        formData.assigned_to,
        formData.task_visibility,
        assigneeGroups,
        fallbackUsers
      )
    ) {
      onSelectChange('assigned_to', '')
    }
  })
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
  {#if showProjectContext}
    <div class="grid gap-2">
      <Label class="font-bold">{t('task.assignment_fields.project', {}, 'Project')}</Label>
      <div class="rounded-md border bg-muted/20 px-3 py-2 text-sm">
        {selectedProject?.name ?? t('task.assignment_fields.no_current_project', {}, 'No current project')}
      </div>
      {#if projectError}
        <p class="text-xs font-bold text-destructive">{projectError}</p>
      {/if}
    </div>
  {/if}

  <div class="grid gap-2">
    <Label for="assigned_to" class="font-bold">{t('task.assigned_to', {}, 'Assignee')}</Label>
    <TaskAssigneeScopeSelects
      visibility={formData.task_visibility}
      assignedTo={formData.assigned_to}
      {assigneeGroups}
      {fallbackUsers}
      disabled={!canAssign}
      onSelect={(value: string) => {
        onSelectChange('assigned_to', value)
      }}
    />
    {#if selectedProject && showProjectContext}
      <p class="text-xs text-muted-foreground">
        {t('ui_misc.tasks.assignment.project', {}, 'Project')}:
        <span class="font-medium text-foreground">{selectedProject.name}</span>
      </p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="task_visibility" class="font-bold">{t('task.assignment_fields.task_visibility', {}, 'Task visibility')}</Label>
    <Select
      value={formData.task_visibility}
      onValueChange={(value: string) => {
        onSelectChange('task_visibility', value)
      }}
    >
      <SelectTrigger>
        <span>{getTaskVisibilityLabel(formData.task_visibility, t)}</span>
      </SelectTrigger>
      <SelectContent class="max-h-80">
        {#each TASK_VISIBILITY_OPTIONS as option (option.value)}
          {@const optionLabel = getTaskVisibilityLabel(option.value, t)}
          <SelectItem value={option.value} label={optionLabel}>
            {optionLabel}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="rounded-xl border border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
    <p>
      {t('task.assignment_fields.project_visibility', {}, 'Project visibility')}:
      <span class="font-medium text-foreground">{getProjectVisibilityLabel(selectedProjectVisibility, t)}</span>
    </p>
    <p class="mt-1">
      {t('task.assignment_fields.task_visibility', {}, 'Task visibility')}:
    <span class="font-medium text-foreground">{getTaskVisibilityLabel(formData.task_visibility, t)}</span>
  </p>
  <p class="mt-2">{getTaskVisibilityDescription(formData.task_visibility, t)}</p>
  <p class="mt-2">{getTaskVisibilityAssignmentRule(formData.task_visibility, t)}</p>
  <p class="mt-2">{getTaskVisibilityMarketplaceRule(formData.task_visibility, t)}</p>
  <p class="mt-2">
    {t('task.assignment_fields.direct_assign_in_form', {}, 'Direct assignment in form')}:
      <span class="font-medium text-foreground"> {t('task.assignment_fields.project_member_count', { count: assigneeGroups.projectMembers.length }, `${assigneeGroups.projectMembers.length} project members`)}</span>,
      <span class="font-medium text-foreground"> {t('task.assignment_fields.org_member_outside_count', { count: assigneeGroups.orgMembersOutsideProject.length }, `${assigneeGroups.orgMembersOutsideProject.length} organization members outside project`)}</span>,
      <span class="font-medium text-foreground"> {t('task.assignment_fields.external_contributor_count', { count: fallbackUsers.length }, `${fallbackUsers.length} external contributors`)}</span>
  </p>
  <p class="mt-2">
    {t('task.assignment_fields.current_organization', {}, 'Current organization')}:
    <span class="font-medium text-foreground"> {getOrganizationScopeLabel(t)}</span>
  </p>
  <p class="mt-2">
    {t('task.assignment_fields.current_assignee', {}, 'Current assignee')}:
    <span class="font-medium text-foreground"> {selectedAssignee?.username ?? selectedAssignee?.email ?? t('task.assignment_fields.scope.unassigned', {}, 'Unassigned')} </span>
    <span>· {selectedAssigneeScope}</span>
  </p>
  {#if formData.task_visibility === 'external' || formData.task_visibility === 'all'}
    <p class="mt-2">
      {t('task.assignment_fields.direct_assign_note', {}, 'This dropdown serves direct assignment. Marketplace application is a separate flow, and runtime currently has no separate scope for outside project but still inside organization.')}
      </p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="parent_task_id" class="font-bold">{t('task.assignment_fields.parent_task', {}, 'Parent task')}</Label>
    <Select
      value={formData.parent_task_id}
      onValueChange={(value: string) => {
        onSelectChange('parent_task_id', value)
      }}
    >
      <SelectTrigger>
        <span>{parentTasks.find((parent) => parent.id === formData.parent_task_id)?.title ?? t('task.assignment_fields.parent_task_placeholder', {}, 'Select parent task (optional)')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each parentTasks.filter((parent) => parent.id !== taskId) as parent (parent.id)}
          <SelectItem value={parent.id} label={parent.title}>
            {parent.title}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
</div>
