<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import type { Task } from '../../types'
  import TaskCreatorInfo from './info/task_creator_info.svelte'
  import TaskDueDateField from './info/task_due_date_field.svelte'
  import StatusField from '../form_fields/status_field.svelte'
  import PriorityField from '../form_fields/priority_field.svelte'
  import LabelField from '../form_fields/label_field.svelte'
  import AssigneeField from '../form_fields/assignee_field.svelte'

  interface Props {
    task: Task
    formData: Partial<Task>
    date: Date | undefined
    handleChange: (e: Event) => void
    handleSelectChange: (name: string, value: string) => void
    handleDateChange: (date: Date | undefined) => void
    errors: Record<string, string>
    isEditing: boolean
    canEdit: boolean
    statuses: Array<{ id: number; name: string; color: string }>
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    labels: Array<{ id: number; name: string; color: string }>
    users: Array<{ id: number; username: string; email: string }>
  }

  const {
    task,
    formData,
    date,
    handleChange,
    handleSelectChange,
    handleDateChange,
    errors,
    isEditing,
    canEdit,
    statuses,
    priorities,
    labels,
    users
  }: Props = $props()
</script>

<div class="grid gap-4">
  <TaskCreatorInfo {task} />

  <div class="grid gap-2">
    <Label for="title">Tiêu đề</Label>
    <Input
      id="title"
      name="title"
      value={formData.title || ''}
      oninput={handleChange}
      placeholder="Nhập tiêu đề nhiệm vụ"
      readonly={!isEditing}
      class={!isEditing ? "opacity-80 cursor-not-allowed" : ""}
    />
    {#if errors.title}
      <p class="text-xs text-red-500">{errors.title}</p>
    {/if}
  </div>

  <div class="grid gap-2">
    <Label for="description">Mô tả</Label>
    <Textarea
      id="description"
      name="description"
      value={formData.description || ''}
      oninput={handleChange}
      placeholder="Nhập mô tả chi tiết về nhiệm vụ"
      rows={3}
      readonly={!isEditing}
      class={!isEditing ? "opacity-80 cursor-not-allowed" : ""}
    />
    {#if errors.description}
      <p class="text-xs text-red-500">{errors.description}</p>
    {/if}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <StatusField
      {formData}
      {handleSelectChange}
      {isEditing}
      {statuses}
      {task}
    />

    <PriorityField
      {formData}
      {handleSelectChange}
      canEdit={canEdit}
      {priorities}
      {task}
    />
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <LabelField
      {formData}
      {handleSelectChange}
      canEdit={canEdit}
      {labels}
      {task}
    />

    <AssigneeField
      {formData}
      {handleSelectChange}
      canEdit={canEdit}
      {users}
      {task}
    />
  </div>

  <TaskDueDateField
    {date}
    canEdit={canEdit}
    {handleDateChange}
  />
</div>
