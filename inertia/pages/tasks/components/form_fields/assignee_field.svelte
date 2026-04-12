<script lang="ts">
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'

  import type { Task } from '../../types.svelte'

  interface Props {
    formData: Partial<Task>
    handleSelectChange: (name: string, value: string) => void
    canEdit: boolean
    users: { id: string; username: string; email: string }[]
    task: Task
  }

  const { formData, handleSelectChange, canEdit, users, task }: Props = $props()

  function getUserInitials(user?: { username: string; email: string }): string {
    if (!user) return '?'

    return user.username.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase() || '?'
  }

  function getUserDisplayName(user?: { username: string; email: string }): string {
    if (!user) return 'Không xác định'

    return user.username || user.email || 'Không xác định'
  }
</script>

<div class="grid gap-2">
  <Label for="assigned_to">Người được giao</Label>
  {#if canEdit}
    <Select
      value={formData.assigned_to ?? ''}
      onValueChange={(value: string) => { handleSelectChange('assigned_to', value); }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Chọn người được giao" />
      </SelectTrigger>
      <SelectContent>
        {#each users as user (user.id)}
          <SelectItem value={user.id}>
            <div class="flex items-center">
              <Avatar class="h-5 w-5">
                <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
              </Avatar>
              <span class="ml-2">{getUserDisplayName(user)}</span>
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
            {getUserInitials(task.assignee)}
          </AvatarFallback>
        </Avatar>
        <span class="ml-2">{getUserDisplayName(task.assignee)}</span>
      {:else}
        Không xác định
      {/if}
    </div>
  {/if}
</div>
