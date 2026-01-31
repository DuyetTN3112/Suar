<script lang="ts">
  import TaskDetailFields from './task_detail_fields.svelte'
  import TaskDetailActions from './task_detail_actions.svelte'
  import type { Task } from '../../../types.svelte'
  import { useTaskDetailForm } from './hooks/use_task_detail_form.svelte'
  import { formatDate } from '../../../utils/task_formatter.svelte'
  import { Calendar, User } from 'lucide-svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  interface Props {
    task: Task
    formData: Partial<Task>
    setFormData: (updater: (prev: Partial<Task>) => Partial<Task>) => void
    isEditing: boolean
    errors: Record<string, string>
    setErrors: (errors: Record<string, string>) => void
    statuses: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    labels: Array<{ id: number; name: string; color: string }>
    users: Array<{ id: number; username: string; email: string }>
    submitting: boolean
    setSubmitting: (value: boolean) => void
    onUpdate?: (updatedTask: Task | null) => void
    canMarkAsCompleted?: boolean
    canDelete?: boolean
    completedStatusId?: number
  }

  const {
    task,
    formData,
    setFormData,
    isEditing,
    errors,
    setErrors,
    statuses,
    priorities,
    labels,
    users,
    submitting,
    setSubmitting,
    onUpdate,
    canMarkAsCompleted = false,
    canDelete = false,
    completedStatusId
  }: Props = $props()

  const { t } = useTranslation()

  const {
    handleChange,
    handleSelectChange,
    handleDateChange,
    handleSubmit
  } = useTaskDetailForm({
    task,
    formData,
    setFormData,
    isEditing,
    errors,
    setErrors,
    submitting,
    setSubmitting,
    onUpdate
  })

  // Tìm thông tin người tạo từ danh sách users
  const creator = $derived(users.find(user => Number(user.id) === Number(task.created_by)))

  // Lấy tên đầy đủ của người tạo
  function getCreatorFullName() {
    if (task.creator) {
      return task.creator.username || task.creator.email || t('task.no_creator_info', {}, 'Không có thông tin')
    } else if (creator) {
      return creator.username || creator.email || t('task.no_creator_info', {}, 'Không có thông tin')
    }
    return t('task.no_creator_info', {}, 'Không có thông tin')
  }

  // Lấy initials cho avatar
  function getCreatorInitials() {
    if (task.creator) {
      return task.creator.username?.[0]?.toUpperCase() || task.creator.email?.[0]?.toUpperCase() || 'U'
    } else if (creator) {
      return creator.username?.[0]?.toUpperCase() || creator.email?.[0]?.toUpperCase() || 'U'
    }
    return 'U'
  }
</script>

<div class="space-y-6">
  <!-- Thông tin người tạo và ngày tạo -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <!-- Người tạo -->
    <div class="bg-muted/30 p-3 rounded-md">
      <div class="flex items-center mb-2">
        <User class="h-4 w-4 mr-2 text-muted-foreground" />
        <p class="text-xs font-medium text-muted-foreground">{t('task.created_by', {}, 'Người tạo')}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
          {getCreatorInitials()}
        </div>
        <span class="text-sm font-medium">
          {getCreatorFullName()}
        </span>
      </div>
    </div>

    <!-- Ngày tạo -->
    <div class="bg-muted/30 p-3 rounded-md">
      <div class="flex items-center mb-2">
        <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
        <p class="text-xs font-medium text-muted-foreground">{t('task.created_at', {}, 'Ngày tạo')}</p>
      </div>
      <p class="text-sm">{formatDate(task.created_at)}</p>
    </div>
  </div>

  <!-- Fields chính của task -->
  <div class="grid gap-4 py-4">
    <TaskDetailFields
      {task}
      {formData}
      {isEditing}
      {errors}
      {statuses}
      {priorities}
      {labels}
      {users}
      {handleChange}
      {handleSelectChange}
      {handleDateChange}
    />

    {#if isEditing}
      <TaskDetailActions
        {task}
        {formData}
        {submitting}
        {setSubmitting}
        {setErrors}
        {onUpdate}
        onSubmit={handleSubmit}
        {canMarkAsCompleted}
        {canDelete}
        {completedStatusId}
      />
    {/if}
  </div>
</div>
