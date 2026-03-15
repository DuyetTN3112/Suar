<script lang="ts">
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import TaskAssigneeScopeSelects from '@/apps/user/modules/tasks/components/shared/task_assignee_scope_selects.svelte'
  import {
    shouldResetAssignedToForVisibility,
    type AssigneeGroups,
  } from '@/apps/user/modules/tasks/lib/task_assignee_scope'
  import {
    BUSINESS_DOMAIN_OPTIONS,
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    TASK_TYPE_OPTIONS,
  } from '@/apps/user/modules/tasks/lib/task_taxonomy'
  import {
    TASK_VISIBILITY_OPTIONS,
  } from '@/apps/user/modules/tasks/lib/rules/task_visibility'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    formData: {
      task_status_id: string
      task_type: string
      role_in_task: string
      business_domain: string
      problem_category: string
      project_id: string
      priority: string
      label: string
      task_visibility: 'internal' | 'external' | 'all'
      assigned_to: string
      parent_task_id: string
      estimated_time: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups: AssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    projects: { id: string; name: string }[]
  }

  const {
    formData,
    handleSelectChange,
    errors,
    statuses,
    priorities,
    labels,
    users,
    assigneeGroups,
    parentTasks,
    projects,
  }: Props = $props()

  const { t } = useTranslation()

  type TaskTaxonomyGroup = 'task_type' | 'business_domain' | 'problem_category' | 'role_in_task'

  function taxonomyLabel(
    group: TaskTaxonomyGroup,
    option: { value: string; label: string }
  ): string {
    return t(`task.taxonomy.${group}.${option.value}`, {}, option.label)
  }

  function selectedTaxonomyLabel(
    group: TaskTaxonomyGroup,
    options: readonly { value: string; label: string }[],
    value: string,
    fallback: string
  ): string {
    const option = options.find((candidate) => candidate.value === value)
    return option ? taxonomyLabel(group, option) : fallback
  }

  const selectedProject = $derived(projects.find((project) => project.id === formData.project_id) ?? null)
  const projectMemberIds = $derived(new Set(assigneeGroups.projectMembers.map((member) => member.id)))
  const orgOutsideProjectIds = $derived(new Set(assigneeGroups.orgMembersOutsideProject.map((member) => member.id)))
  const fallbackUsers = $derived(
    users.filter((user) => !projectMemberIds.has(user.id) && !orgOutsideProjectIds.has(user.id))
  )

  function taskVisibilityLabel(value: Props['formData']['task_visibility']): string {
    switch (value) {
      case 'internal':
        return t('task.create.visibility.internal', {}, 'Organization only')
      case 'external':
        return t('task.create.visibility.external', {}, 'Marketplace')
      case 'all':
        return t('task.create.visibility.all', {}, 'Hybrid: internal + marketplace')
    }
  }

  $effect(() => {
    if (
      shouldResetAssignedToForVisibility(
        formData.assigned_to,
        formData.task_visibility,
        assigneeGroups,
        fallbackUsers
      )
    ) {
      handleSelectChange('assigned_to', '')
    }
  })
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div class="grid gap-2">
    <Label>{t('task.create.project', {}, 'Project')}</Label>
    <div class="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      {selectedProject?.name ?? t('task.create.no_current_project', {}, 'No current project')}
    </div>
  </div>

  <div class="grid gap-2">
    <Label for="task_status_id">
      {t('task.status', {}, 'Status')}<span class="ml-1 text-destructive">*</span>
    </Label>
    <Select
      value={formData.task_status_id}
      onValueChange={(value: string) => {
        handleSelectChange('task_status_id', value)
      }}
    >
      <SelectTrigger>
        <span>{statuses.find((status) => status.value === formData.task_status_id)?.label ?? t('task.select_status', {}, 'Select status')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.value)}
          <SelectItem value={status.value} label={status.label}>
            {status.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.task_status_id}
      <p class="text-xs text-destructive">{errors.task_status_id}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="task_type">{t('task.create.task_type', {}, 'Task type')}</Label>
    <Select
      value={formData.task_type}
      onValueChange={(value: string) => {
        handleSelectChange('task_type', value)
      }}
    >
      <SelectTrigger>
        <span>{selectedTaxonomyLabel('task_type', TASK_TYPE_OPTIONS, formData.task_type, t('task.create.select_task_type', {}, 'Select task type'))}</span>
      </SelectTrigger>
      <SelectContent>
        {#each TASK_TYPE_OPTIONS as option (option.value)}
          <SelectItem value={option.value} label={taxonomyLabel('task_type', option)}>
            {taxonomyLabel('task_type', option)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.task_type}
      <p class="text-xs text-destructive">{errors.task_type}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div class="grid gap-2">
    <Label for="business_domain">{t('task.create.business_domain', {}, 'Business domain')}</Label>
    <Select
      value={formData.business_domain}
      onValueChange={(value: string) => {
        handleSelectChange('business_domain', value === '__none' ? '' : value)
      }}
    >
      <SelectTrigger>
        <span>{selectedTaxonomyLabel('business_domain', BUSINESS_DOMAIN_OPTIONS, formData.business_domain, t('task.create.select_business_domain', {}, 'Select business domain'))}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none" label={t('task.create.no_selection', {}, 'No selection')}>{t('task.create.no_selection', {}, 'No selection')}</SelectItem>
        {#each BUSINESS_DOMAIN_OPTIONS as option (option.value)}
          <SelectItem value={option.value} label={taxonomyLabel('business_domain', option)}>
            {taxonomyLabel('business_domain', option)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.business_domain}
      <p class="text-xs text-destructive">{errors.business_domain}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="problem_category">{t('task.create.problem_category', {}, 'Problem category')}</Label>
    <Select
      value={formData.problem_category}
      onValueChange={(value: string) => {
        handleSelectChange('problem_category', value === '__none' ? '' : value)
      }}
    >
      <SelectTrigger>
        <span>{selectedTaxonomyLabel('problem_category', PROBLEM_CATEGORY_OPTIONS, formData.problem_category, t('task.create.select_problem_category', {}, 'Select problem category'))}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none" label={t('task.create.no_selection', {}, 'No selection')}>{t('task.create.no_selection', {}, 'No selection')}</SelectItem>
        {#each PROBLEM_CATEGORY_OPTIONS as option (option.value)}
          <SelectItem value={option.value} label={taxonomyLabel('problem_category', option)}>
            {taxonomyLabel('problem_category', option)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.problem_category}
      <p class="text-xs text-destructive">{errors.problem_category}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="role_in_task">{t('task.create.role_in_task', {}, 'Role in task')}</Label>
    <Select
      value={formData.role_in_task}
      onValueChange={(value: string) => {
        handleSelectChange('role_in_task', value === '__none' ? '' : value)
      }}
    >
      <SelectTrigger>
        <span>{selectedTaxonomyLabel('role_in_task', ROLE_IN_TASK_OPTIONS, formData.role_in_task, t('task.create.select_role', {}, 'Select role'))}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none" label={t('task.create.no_selection', {}, 'No selection')}>{t('task.create.no_selection', {}, 'No selection')}</SelectItem>
        {#each ROLE_IN_TASK_OPTIONS as option (option.value)}
          <SelectItem value={option.value} label={taxonomyLabel('role_in_task', option)}>
            {taxonomyLabel('role_in_task', option)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.role_in_task}
      <p class="text-xs text-destructive">{errors.role_in_task}</p>
    {/if}
  </div>
</div>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="grid gap-2">
    <Label for="priority">{t('task.priority', {}, 'Priority')}</Label>
    <Select
      value={formData.priority}
      onValueChange={(value: string) => {
        handleSelectChange('priority', value)
      }}
    >
      <SelectTrigger>
        <span>{priorities.find((priority) => priority.value === formData.priority)?.label ?? t('task.select_priority', {}, 'Select priority')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.value)}
          <SelectItem value={priority.value} label={priority.label}>
            {priority.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.priority}
      <p class="text-xs text-destructive">{errors.priority}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="label">{t('task.label', {}, 'Label')}</Label>
    <Select
      value={formData.label}
      onValueChange={(value: string) => {
        handleSelectChange('label', value)
      }}
    >
      <SelectTrigger>
        <span>{labels.find((label) => label.value === formData.label)?.label ?? t('task.select_label', {}, 'Select label')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each labels as label (label.value)}
          <SelectItem value={label.value} label={label.label}>
            {label.label}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if errors.label}
      <p class="text-xs text-destructive">{errors.label}</p>
    {/if}
  </div>
</div>

<div class="grid gap-4 md:grid-cols-2">
  <div class="grid gap-2">
    <Label for="assigned_to">{t('task.assigned_to', {}, 'Assigned to')}</Label>
    <TaskAssigneeScopeSelects
      visibility={formData.task_visibility}
      assignedTo={formData.assigned_to}
      {assigneeGroups}
      {fallbackUsers}
      onSelect={(value: string) => {
        handleSelectChange('assigned_to', value)
      }}
    />
    {#if selectedProject}
      <p class="text-xs text-muted-foreground">
        {t('task.create.project', {}, 'Project')}: <span class="font-medium text-foreground">{selectedProject.name}</span>
      </p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="task_visibility">{t('task.create.task_visibility', {}, 'Task visibility')}</Label>
    <Select
      value={formData.task_visibility}
      onValueChange={(value: string) => {
        handleSelectChange('task_visibility', value)
      }}
    >
      <SelectTrigger>
        <span>{taskVisibilityLabel(formData.task_visibility)}</span>
      </SelectTrigger>
      <SelectContent class="max-h-80">
        {#each TASK_VISIBILITY_OPTIONS as option (option.value)}
          <SelectItem value={option.value} label={taskVisibilityLabel(option.value)}>
            {taskVisibilityLabel(option.value)}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>
</div>

<div class="grid grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label for="parent_task_id">{t('task.create.parent_task', {}, 'Task cha')}</Label>
    <Select
      value={formData.parent_task_id}
      onValueChange={(value: string) => {
        handleSelectChange('parent_task_id', value)
      }}
    >
      <SelectTrigger>
        <span>{parentTasks.find((task) => task.id === formData.parent_task_id)?.title ?? t('task.create.select_parent_task', {}, 'Select parent task (optional)')}</span>
      </SelectTrigger>
      <SelectContent>
        {#each parentTasks as task (task.id)}
          <SelectItem value={task.id} label={task.title}>
            {task.title}
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  <div class="grid gap-2">
    <Label for="estimated_time">{t('task.estimated_time', {}, 'Estimated time (hours)')}</Label>
    <Input
      id="estimated_time"
      type="number"
      min="0"
      step="0.5"
      value={formData.estimated_time}
      oninput={(event: Event) => {
        const target = event.target as HTMLInputElement
        handleSelectChange('estimated_time', target.value)
      }}
      placeholder="0"
    />
    {#if errors.estimated_time}
      <p class="text-xs text-destructive">{errors.estimated_time}</p>
    {/if}
  </div>
</div>
