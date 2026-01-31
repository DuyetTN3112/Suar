<script lang="ts">
  import type { Task } from '../../types'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  interface Props {
    formData: Partial<Task>
    handleSelectChange: (name: string, value: string) => void
    isEditing: boolean
    statuses: Array<{ id: number; name: string; color: string }>
    task: Task
  }

  const { formData, handleSelectChange, isEditing, statuses, task }: Props = $props()
</script>

<div class="grid gap-2">
  <Label for="status_id">Trạng thái</Label>
  {#if isEditing}
    <Select
      value={String(formData.status_id || '')}
      onValueChange={(value) => { handleSelectChange('status_id', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.id)}
          <SelectItem value={String(status.id)}>
            <div class="flex items-center">
              <span
                class="inline-block w-3 h-3 rounded-full mr-2"
                style="background-color: {status.color}"
              ></span>
              {status.name}
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {:else}
    <div class="p-2 border rounded-md flex items-center">
      {#if task.status}
        <span
          class="inline-block w-3 h-3 rounded-full mr-2"
          style="background-color: {task.status.color}"
        ></span>
        {task.status.name}
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
