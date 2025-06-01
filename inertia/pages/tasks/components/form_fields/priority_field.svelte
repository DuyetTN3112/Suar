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
    canEdit: boolean
    priorities: Array<{ id: number; name: string; color: string; value: number }>
    task: Task
  }

  const { formData, handleSelectChange, canEdit, priorities, task }: Props = $props()

  const currentPriority = $derived(priorities.find(p => p.id === (formData.priority_id || task.priority_id)))
</script>

<div class="grid gap-2">
  <Label for="priority_id">Độ ưu tiên</Label>
  {#if canEdit}
    <Select
      value={String(formData.priority_id || '')}
      onValueChange={(value) => { handleSelectChange('priority_id', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn độ ưu tiên" />
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.id)}
          <SelectItem value={String(priority.id)}>
            <div class="flex items-center">
              <span
                class="inline-block w-3 h-3 rounded-full mr-2"
                style="background-color: {priority.color}"
              ></span>
              {priority.name}
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {:else}
    <div class="p-2 border rounded-md flex items-center">
      {#if currentPriority}
        <span
          class="inline-block w-3 h-3 rounded-full mr-2"
          style="background-color: {currentPriority.color}"
        ></span>
        {currentPriority.name}
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
