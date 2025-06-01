<script lang="ts">
  import type { Task } from '../../types'
  import Label from '@/components/ui/label.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  interface Props {
    formData: Partial<Task>
    handleSelectChange: (name: string, value: string) => void
    canEdit: boolean
    users: Array<{ id: number; username: string; email: string }>
    task: Task
  }

  const { formData, handleSelectChange, canEdit, users, task }: Props = $props()
</script>

<div class="grid gap-2">
  <Label for="assigned_to">Người được giao</Label>
  {#if canEdit}
    <Select
      value={String(formData.assigned_to || '')}
      onValueChange={(value) => { handleSelectChange('assigned_to', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn người được giao" />
      </SelectTrigger>
      <SelectContent>
        {#each users as user (user.id)}
          <SelectItem value={String(user.id)}>
            <div class="flex items-center">
              <Avatar class="h-5 w-5">
                <AvatarFallback>{user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              <span class="ml-2">{user.username || user.email}</span>
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  {:else}
    <div class="p-2 border rounded-md flex items-center">
      {#if task.assignee}
        <Avatar class="h-7 w-7">
          <AvatarFallback>
            {task.assignee.username?.[0]?.toUpperCase() || task.assignee.email?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <span class="ml-2">{task.assignee.username || task.assignee.email}</span>
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
