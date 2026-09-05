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
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    formData: {
      priority: string
      label: string
      task_visibility: 'project' | 'internal' | 'external' | 'all'
      reviewer_visibility?: 'project' | 'internal' | 'external' | 'all'
      assigned_to: string
      reviewer_user_id?: string
      parent_task_id: string
      estimated_time: string
    }
    handleSelectChange: (name: string, value: string) => void
    errors: Record<string, string>
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups: AssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    isPublish?: boolean
    isDocumentationItem?: boolean
    section?: 'all' | 'assignment' | 'planning'
    onEstimatedTimeChange?: (value: string) => void
  }

  const {
    formData,
    handleSelectChange,
    errors,
    priorities,
    labels,
    users,
    assigneeGroups,
    parentTasks,
    isDocumentationItem = false,
    section = 'all',
    onEstimatedTimeChange,
  }: Props = $props()

  const { t } = useTranslation()

  const projectMemberIds = $derived(new Set(assigneeGroups.projectMembers.map((member) => member.id)))
  const orgOutsideProjectIds = $derived(new Set(assigneeGroups.orgMembersOutsideProject.map((member) => member.id)))
  const fallbackUsers = $derived(
    users.filter((user) => !projectMemberIds.has(user.id) && !orgOutsideProjectIds.has(user.id))
  )

  const isOrganizationVisibility = $derived(
    formData.task_visibility === 'project' || formData.task_visibility === 'internal'
  )
  const reviewerVisibility = $derived(formData.reviewer_visibility ?? 'project')
  const selectedReviewerIsProjectMember = $derived(
    !formData.reviewer_user_id || projectMemberIds.has(formData.reviewer_user_id)
  )
  const canDirectAssign = $derived(
    formData.task_visibility === 'project' && reviewerVisibility === 'project' && selectedReviewerIsProjectMember
  )
  const isReviewerOrganizationVisibility = $derived(
    reviewerVisibility === 'project' || reviewerVisibility === 'internal'
  )

  $effect(() => {
    if (isDocumentationItem && (formData.assigned_to || formData.reviewer_user_id)) {
      handleSelectChange('assigned_to', '')
      handleSelectChange('reviewer_user_id', '')
      return
    }
    if (formData.assigned_to && !canDirectAssign) {
      handleSelectChange('assigned_to', '')
    }
    if (
      formData.reviewer_user_id &&
      !selectedReviewerIsProjectMember &&
      formData.task_visibility === 'project'
    ) {
      handleSelectChange('task_visibility', reviewerVisibility === 'all' || reviewerVisibility === 'external' ? 'all' : 'internal')
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
    if (
      shouldResetAssignedToForVisibility(
        formData.reviewer_user_id ?? '',
        reviewerVisibility,
        assigneeGroups,
        fallbackUsers
      )
    ) {
      handleSelectChange('reviewer_user_id', '')
    }
  })
</script>

{#if !isDocumentationItem && section !== 'assignment'}
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="grid gap-2">
    <Label for="priority">{t('task.priority', {}, 'Priority')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span></Label>
    <Select
      value={formData.priority}
      onValueChange={(value: string) => {
        handleSelectChange('priority', value)
      }}
    >
      <SelectTrigger id="priority" aria-required="true" aria-invalid={errors.priority ? 'true' : undefined}>
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
    <Label for="label">{t('task.label', {}, 'Label')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span></Label>
    <Select
      value={formData.label}
      onValueChange={(value: string) => {
        handleSelectChange('label', value)
      }}
    >
      <SelectTrigger id="label" aria-required="true" aria-invalid={errors.label ? 'true' : undefined}>
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

{#if section !== 'planning'}
<div class="grid gap-4">
  <fieldset class="order-1 grid gap-2">
    <legend class="text-sm font-medium leading-none">
      {t('task.create.task_visibility', {}, 'Visibility scope')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
    </legend>
    <div class="grid gap-3 rounded-md border bg-muted/20 p-3">
      <label class="flex cursor-pointer items-start gap-2 text-sm">
        <input type="radio" name="task_visibility_mode" value="internal" checked={isOrganizationVisibility} onchange={() => handleSelectChange('task_visibility', formData.task_visibility === 'project' ? 'project' : 'internal')} class="mt-0.5" />
        <span>{t('task.create.visibility.internal_root', {}, 'Chỉ trong tổ chức')}</span>
      </label>
      {#if isOrganizationVisibility}
        <fieldset class="ml-6 grid gap-2 border-l border-border pl-3">
          <legend class="sr-only">{t('task.create.visibility.organization_subscope', {}, 'Phạm vi trong tổ chức')}</legend>
          <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="task_visibility" value="project" checked={formData.task_visibility === 'project'} onchange={() => handleSelectChange('task_visibility', 'project')} class="mt-0.5" /><span>{t('task.create.visibility.project', {}, 'Chỉ trong project')}</span></label>
          <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="task_visibility" value="internal" checked={formData.task_visibility === 'internal'} onchange={() => handleSelectChange('task_visibility', 'internal')} class="mt-0.5" /><span>{t('task.create.visibility.internal', {}, 'Toàn tổ chức')}</span></label>
        </fieldset>
      {/if}
      <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="task_visibility_mode" value="all" checked={formData.task_visibility === 'all'} onchange={() => handleSelectChange('task_visibility', 'all')} class="mt-0.5" /><span>{t('task.create.visibility.all_root', {}, 'Mở thêm cho người ngoài tổ chức qua Marketplace')}</span></label>
      {#if formData.task_visibility === 'external'}
        <label class="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground"><input type="radio" name="task_visibility_mode" value="external" checked onchange={() => handleSelectChange('task_visibility', 'external')} class="mt-0.5" /><span>{t('task.create.visibility.external_legacy', {}, 'Marketplace (legacy)')}</span></label>
      {/if}
    </div>
  </fieldset>
 </div>
{/if}

{#if !isDocumentationItem && section !== 'planning' && canDirectAssign}
  <div class="order-2 grid gap-2">
    <Label for="assigned-to-field">
      {t('task.assigned_to', {}, 'Assigned to')}
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
{:else if !isDocumentationItem && section !== 'planning'}
  <div class="order-2 rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
    Scope này mở luồng ứng tuyển; chỉ task trong project và người nghiệm thu thuộc project mới có thể giao trực tiếp.
  </div>
{/if}

{#if !isDocumentationItem && section !== 'planning'}
  <div class="order-3 grid gap-2">
    <fieldset class="grid gap-2">
      <legend class="text-sm font-medium leading-none">
        {t('task.create.reviewer_visibility', {}, 'Phạm vi hiển thị người nghiệm thu')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>
      </legend>
      <div class="grid gap-3 rounded-md border bg-muted/20 p-3">
        <label class="flex cursor-pointer items-start gap-2 text-sm">
          <input type="radio" name="reviewer_visibility_mode" value="internal" checked={isReviewerOrganizationVisibility} onchange={() => handleSelectChange('reviewer_visibility', reviewerVisibility === 'project' ? 'project' : 'internal')} class="mt-0.5" />
          <span>{t('task.create.visibility.internal_root', {}, 'Chỉ trong tổ chức')}</span>
        </label>
        {#if isReviewerOrganizationVisibility}
          <fieldset class="ml-6 grid gap-2 border-l border-border pl-3">
            <legend class="sr-only">{t('task.create.visibility.organization_subscope', {}, 'Phạm vi trong tổ chức')}</legend>
            <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="reviewer_visibility" value="project" checked={reviewerVisibility === 'project'} onchange={() => handleSelectChange('reviewer_visibility', 'project')} class="mt-0.5" /><span>{t('task.create.visibility.project', {}, 'Chỉ trong project')}</span></label>
            <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="reviewer_visibility" value="internal" checked={reviewerVisibility === 'internal'} onchange={() => handleSelectChange('reviewer_visibility', 'internal')} class="mt-0.5" /><span>{t('task.create.visibility.internal', {}, 'Toàn tổ chức')}</span></label>
          </fieldset>
        {/if}
        <label class="flex cursor-pointer items-start gap-2 text-sm"><input type="radio" name="reviewer_visibility_mode" value="all" checked={reviewerVisibility === 'all'} onchange={() => handleSelectChange('reviewer_visibility', 'all')} class="mt-0.5" /><span>{t('task.create.visibility.all_root', {}, 'Mở thêm cho người ngoài tổ chức qua Marketplace')}</span></label>
      </div>
    </fieldset>
    {#if reviewerVisibility === 'project'}
      <div id="reviewer-user-field" tabindex="-1" aria-invalid={errors.reviewer_user_id ? 'true' : undefined} aria-describedby={errors.reviewer_user_id ? 'reviewer_user_id-error' : undefined} class={errors.reviewer_user_id ? 'rounded-lg ring-2 ring-destructive/30' : ''}>
        <TaskAssigneeScopeSelects
          visibility="project"
          assignedTo={formData.reviewer_user_id ?? ''}
          fieldId="reviewer_user_id"
          fieldLabel={t('task.create.reviewer_user', {}, 'Người nghiệm thu (chọn 1 người)')}
          fieldPlaceholder={t('task.create.reviewer_user_placeholder', {}, 'Chọn một người nghiệm thu')}
          {assigneeGroups}
          {fallbackUsers}
          onSelect={(value: string) => {
            handleSelectChange('reviewer_user_id', value)
          }}
        />
      </div>
      {#if errors.reviewer_user_id}<p id="reviewer_user_id-error" class="text-xs font-medium text-destructive" role="alert">{errors.reviewer_user_id}</p>{/if}
    {:else}
      <div class="rounded-md border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
        Phạm vi này mở luồng ứng tuyển; người nghiệm thu sẽ được xác định trong quy trình ứng tuyển, không giao trực tiếp tại đây.
      </div>
    {/if}
  </div>
{/if}

{#if !isDocumentationItem && section !== 'assignment'}
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
    <Label for="estimated_time">{t('task.estimated_time', {}, 'Estimated time (hours)')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span></Label>
    <Input
      id="estimated_time"
      type="number"
      min="0"
      step="0.5"
      value={formData.estimated_time}
      oninput={(event: Event) => {
        const target = event.target as HTMLInputElement
        if (onEstimatedTimeChange) {
          onEstimatedTimeChange(target.value)
        } else {
          handleSelectChange('estimated_time', target.value)
        }
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
