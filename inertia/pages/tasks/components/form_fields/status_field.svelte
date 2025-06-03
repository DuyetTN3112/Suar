<script lang="ts">
  import type { Task } from '../../types.svelte'
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
    statuses: Array<{ value: string; label: string; color: string }>
    task: Task
  }

  const { formData, handleSelectChange, isEditing, statuses, task }: Props = $props()

  const currentStatus = $derived(statuses.find(s => s.value === (formData.status || task.status)))
</script>

<div class="grid gap-2">
  <Label for="status">Trạng thái</Label>
  {#if isEditing}
    <Select
      value={formData.status || ''}
      onValueChange={(value) => { handleSelectChange('status', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn trạng thái" />
      </SelectTrigger>
      <SelectContent>
        {#each statuses as status (status.value)}
          <SelectItem value={status.value}>
            <div class="flex items-center">
              <span
                class="inline-block w-3 h-3 rounded-full mr-2"
                style="background-color: {status.color}"
              ></span>
              {status.label}
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {:else}
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
  {/if}
</div>
