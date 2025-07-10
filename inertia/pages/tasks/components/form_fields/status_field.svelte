<script lang="ts">
  import type { Task } from '../../types.svelte'
  import Label from '@/components/ui/label.svelte'

  interface Props {
    formData: Partial<Task>
    handleSelectChange: (name: string, value: string) => void
    isEditing: boolean
    statuses: Array<{ value: string; label: string; color: string }>
    task: Task
  }

  const {
    formData,
    handleSelectChange: _handleSelectChange,
    isEditing,
    statuses,
    task,
  }: Props = $props()

  const activeStatusId = $derived(formData.task_status_id || task.task_status_id || '')
  const currentStatus = $derived(statuses.find((status) => status.value === activeStatusId))
</script>

<div class="grid gap-2">
  <Label for="task_status_id">Trạng thái</Label>
  <div class="p-2 border rounded-md flex items-center">
    {#if currentStatus}
      <span
        class="inline-block w-3 h-3 rounded-full mr-2"
        style="background-color: {currentStatus.color}"
      ></span>
      {currentStatus.label}
    {:else}
      {task.status || 'Không xác định'}
    {/if}
  </div>
  {#if isEditing}
    <p class="text-xs text-muted-foreground">
      Trạng thái đi theo workflow của tổ chức. Hãy đổi trạng thái ở board hoặc panel chi tiết.
    </p>
  {/if}
</div>
