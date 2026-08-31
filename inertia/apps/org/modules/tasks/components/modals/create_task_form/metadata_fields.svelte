<script lang="ts">
  import Input from '@/apps/org/shared/ui/input.svelte'
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
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    TASK_TYPE_OPTIONS,
  } from '@/apps/org/modules/tasks/lib/task_taxonomy'
  import {
    TASK_VISIBILITY_OPTIONS,
  } from '@/apps/org/modules/tasks/lib/rules/task_visibility'
  import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

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
      task_visibility: 'project' | 'internal' | 'external' | 'all'
      assigned_to: string
      parent_task_id: string
      estimated_time: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    statuses: { value: string; label: string; slug?: string; category?: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups: AssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    isPublish?: boolean
    isDocumentationItem?: boolean
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
    isPublish = true,
    isDocumentationItem = false,
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

  const projectMemberIds = $derived(new Set(assigneeGroups.projectMembers.map((member) => member.id)))
  const orgOutsideProjectIds = $derived(new Set(assigneeGroups.orgMembersOutsideProject.map((member) => member.id)))
  const fallbackUsers = $derived(
    users.filter((user) => !projectMemberIds.has(user.id) && !orgOutsideProjectIds.has(user.id))
  )

  const taskVisibilityOption = $derived(
    TASK_VISIBILITY_OPTIONS.find((option) => option.value === formData.task_visibility)
  )
  const isOrganizationVisibility = $derived(
    formData.task_visibility === 'project' || formData.task_visibility === 'internal'
  )
  const taskVisibilityDescription = $derived(
    taskVisibilityOption
      ? t(taskVisibilityOption.descriptionKey, {}, taskVisibilityOption.description)
      : ''
  )
  const canDirectAssign = $derived(formData.task_visibility === 'project')

  $effect(() => {
    if (isDocumentationItem && formData.assigned_to) {
      handleSelectChange('assigned_to', '')
      return
    }
    if (formData.assigned_to && !canDirectAssign) {
      handleSelectChange('assigned_to', '')
    }
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

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="grid gap-2">
    <Label for="task_status_id">
      {t('task.status', {}, 'Status')}<span class="ml-1 text-[#ef4444]">*</span>
    </Label>
    <Select
      value={formData.task_status_id}
      onValueChange={(value: string) => {
        handleSelectChange('task_status_id', value)
        if (isDocumentationTaskStatusId(value, statuses)) {
          handleSelectChange('assigned_to', '')
        }
      }}
    >
      <SelectTrigger
        id="task_status_id"
        aria-required="true"
        aria-invalid={errors.task_status_id ? 'true' : undefined}
        aria-describedby={errors.task_status_id ? 'task_status_id-error' : undefined}
        class={errors.task_status_id ? 'border-destructive' : ''}
      >
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
      <p id="task_status_id-error" class="text-xs font-medium text-destructive" role="alert">{errors.task_status_id}</p>
    {/if}
  </div>

  {#if !isDocumentationItem}<div class="grid gap-2">
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
  </div>{/if}
</div>

{#if !isDocumentationItem}
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="grid gap-2">
    <Label for="problem_category">{t('task.create.problem_category', {}, 'Problem to solve')}</Label>
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
    <Label for="role_in_task">
      {t('task.create.role_in_task', {}, 'Role needed for task')}
      {#if isPublish}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>{/if}
    </Label>
    <Select
      value={formData.role_in_task}
      onValueChange={(value: string) => {
        handleSelectChange('role_in_task', value === '__none' ? '' : value)
      }}
    >
      <SelectTrigger
        id="role_in_task"
        aria-required={isPublish ? 'true' : undefined}
        aria-invalid={errors.role_in_task ? 'true' : undefined}
        aria-describedby={errors.role_in_task ? 'role_in_task-error' : undefined}
        class={errors.role_in_task ? 'border-destructive' : ''}
      >
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
      <p id="role_in_task-error" class="text-xs font-medium text-destructive" role="alert">{errors.role_in_task}</p>
    {/if}
    <p class="text-xs text-muted-foreground">
      {t('task.create.role_in_task_help', {}, 'Prioritizes project members with the right role; it is not the task creator or assignee.')}
    </p>
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
{/if}

<div class="grid gap-4 md:grid-cols-2">
  <fieldset class="order-1 grid gap-2">
    <legend class="text-sm font-medium leading-none">
      {t('task.create.task_visibility', {}, 'Visibility scope')}
    </legend>
    <div class="grid gap-3 rounded-md border bg-muted/20 p-3">
      <label class="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="radio"
          name="task_visibility_mode"
          value="internal"
          checked={isOrganizationVisibility}
          onchange={() => handleSelectChange('task_visibility', formData.task_visibility === 'project' ? 'project' : 'internal')}
          class="mt-0.5"
        />
        <span>{t('task.create.visibility.internal_root', {}, 'Chỉ trong tổ chức')}</span>
      </label>
      {#if isOrganizationVisibility}
        <fieldset class="ml-6 grid gap-2 border-l border-border pl-3">
          <legend class="sr-only">{t('task.create.visibility.organization_subscope', {}, 'Phạm vi trong tổ chức')}</legend>
          <label class="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="task_visibility"
              value="project"
              checked={formData.task_visibility === 'project'}
              onchange={() => handleSelectChange('task_visibility', 'project')}
              class="mt-0.5"
            />
            <span>{t('task.create.visibility.project', {}, 'Chỉ trong project')}</span>
          </label>
          <label class="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="task_visibility"
              value="internal"
              checked={formData.task_visibility === 'internal'}
              onchange={() => handleSelectChange('task_visibility', 'internal')}
              class="mt-0.5"
            />
            <span>{t('task.create.visibility.internal', {}, 'Toàn tổ chức')}</span>
          </label>
        </fieldset>
      {/if}
      <label class="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="radio"
          name="task_visibility_mode"
          value="all"
          checked={formData.task_visibility === 'all'}
          onchange={() => handleSelectChange('task_visibility', 'all')}
          class="mt-0.5"
        />
        <span>{t('task.create.visibility.all_root', {}, 'Mở thêm cho người ngoài tổ chức qua Marketplace')}</span>
      </label>
      {#if formData.task_visibility === 'external'}
        <label class="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
          <input
            type="radio"
            name="task_visibility_mode"
            value="external"
            checked
            onchange={() => handleSelectChange('task_visibility', 'external')}
            class="mt-0.5"
          />
          <span>{t('task.create.visibility.external_legacy', {}, 'Marketplace (legacy)')}</span>
        </label>
      {/if}
    </div>
    <p class="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground" data-testid="task-visibility-description">
      {taskVisibilityDescription}
    </p>
    {#if !isDocumentationItem}
      <p class="text-xs text-muted-foreground">
        {t('task.create.visibility_then_assignee_help', {}, 'Chọn phạm vi hiển thị trước, sau đó chọn đúng một người thực hiện.')}
      </p>
    {/if}
  </fieldset>

  {#if isDocumentationItem}
    <div class="order-2 rounded-md border border-sky-500/25 bg-sky-500/5 px-3 py-3 text-xs leading-5 text-muted-foreground">
      {t('task.create.docs_no_assignee', {}, 'Docs là mục thông tin chung của dự án nên không có người thực hiện.')}
    </div>
  {:else if canDirectAssign}
  <div class="order-2 grid gap-2">
    <Label for="assigned-to-field">
      {t('task.assigned_to', {}, 'Assigned to')}
      {#if isPublish}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>{/if}
    </Label>
    <div id="assigned-to-field" tabindex="-1" aria-invalid={errors.assigned_to ? 'true' : undefined} aria-describedby={errors.assigned_to ? 'assigned_to-error' : undefined} class={errors.assigned_to ? 'rounded-lg ring-2 ring-destructive/30' : ''}>
      <TaskAssigneeScopeSelects
        visibility={formData.task_visibility}
        assignedTo={formData.assigned_to}
        {assigneeGroups}
        {fallbackUsers}
        onSelect={(value: string) => {
          handleSelectChange('assigned_to', value)
        }}
      />
    </div>
    {#if errors.assigned_to}<p id="assigned_to-error" class="text-xs font-medium text-destructive" role="alert">{errors.assigned_to}</p>{/if}
  </div>
  {:else}
    <div class="order-2 rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
      {t('task.create.application_scope_note', {}, 'Scope này mở luồng ứng tuyển; chỉ task trong project mới có thể giao trực tiếp.')}
    </div>
  {/if}

</div>

{#if !isDocumentationItem}
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
      aria-invalid={errors.estimated_time ? 'true' : undefined}
      aria-describedby={errors.estimated_time ? 'estimated_time-error' : undefined}
      class={errors.estimated_time ? 'border-destructive' : ''}
    />
    {#if errors.estimated_time}
      <p id="estimated_time-error" class="text-xs font-medium text-destructive" role="alert">{errors.estimated_time}</p>
    {/if}
  </div>
</div>
{/if}
