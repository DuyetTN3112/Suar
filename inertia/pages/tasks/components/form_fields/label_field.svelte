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
    labels: Array<{ id: number; name: string; color: string }>
    task: Task
  }

  const { formData, handleSelectChange, canEdit, labels, task }: Props = $props()

  const currentLabel = $derived(labels.find(l => l.id === (formData.label_id || task.label_id)))
</script>

<div class="grid gap-2">
  <Label for="label_id">Nhãn</Label>
  {#if canEdit}
    <Select
      value={String(formData.label_id || '')}
      onValueChange={(value) => { handleSelectChange('label_id', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn nhãn" />
      </SelectTrigger>
      <SelectContent>
        {#each labels as label (label.id)}
          <SelectItem value={String(label.id)}>
            <div class="flex items-center">
              <span
                class="inline-block w-3 h-3 rounded-full mr-2"
                style="background-color: {label.color}"
              ></span>
              {label.name}
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {:else}
    <div class="p-2 border rounded-md flex items-center">
      {#if currentLabel}
        <span
          class="inline-block w-3 h-3 rounded-full mr-2"
          style="background-color: {currentLabel.color}"
        ></span>
        {currentLabel.name}
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
