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
    canEdit: boolean
    priorities: Array<{ value: string; label: string; color: string }>
    task: Task
  }

  const { formData, handleSelectChange, canEdit, priorities, task }: Props = $props()

  const currentPriority = $derived(priorities.find(p => p.value === (formData.priority || task.priority)))
</script>

<div class="grid gap-2">
  <Label for="priority">Độ ưu tiên</Label>
  {#if canEdit}
    <Select
      value={formData.priority || ''}
      onValueChange={(value: string) => { handleSelectChange('priority', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn độ ưu tiên" />
      </SelectTrigger>
      <SelectContent>
        {#each priorities as priority (priority.value)}
          <SelectItem value={priority.value}>
            <div class="flex items-center">
              <span
                class="inline-block w-3 h-3 rounded-full mr-2"
                style="background-color: {priority.color}"
              ></span>
              {priority.label}
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
        {currentPriority.label}
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
