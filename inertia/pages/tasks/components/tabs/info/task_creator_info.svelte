<script lang="ts">
  import Label from '@/components/ui/label.svelte'
  import Avatar from '@/components/ui/avatar.svelte'
  import AvatarFallback from '@/components/ui/avatar_fallback.svelte'
  import type { Task } from '../../../types'
  import { formatDate } from '../../task_detail_utils'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div class="grid gap-2">
    <Label>Người tạo</Label>
    <div class="p-2 border rounded-md flex items-center gap-2">
      {#if task.creator}
        <Avatar class="h-7 w-7">
          <AvatarFallback>
            {task.creator.username?.[0]?.toUpperCase() || task.creator.email?.[0]?.toUpperCase() || 'NA'}
          </AvatarFallback>
        </Avatar>
        <span>{task.creator.username || task.creator.email}</span>
      {:else}
        <span>Không xác định</span>
      {/if}
    </div>
  </div>

  <div class="grid gap-2">
    <Label>Ngày tạo</Label>
    <div class="p-2 border rounded-md">
      {formatDate(task.created_at)}
    </div>
  </div>
</div>
