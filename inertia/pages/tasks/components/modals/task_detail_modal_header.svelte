<script lang="ts">
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import type { Task } from '../../types.svelte'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()
  const statusColor = $derived.by(() => {
    const colors: Record<string, string> = {
      todo: '#94a3b8',
      in_progress: '#3b82f6',
      in_review: '#a855f7',
      done: '#22c55e',
      cancelled: '#ef4444',
    }

    return colors[task.status] ?? '#94a3b8'
  })
</script>

<DialogHeader class="flex flex-row items-center">
  <div class="flex-1">
    <DialogTitle class="text-xl flex items-center gap-2">
      {#if task.status}
        <span
          class="inline-block w-3 h-3 rounded-full mr-2"
          style="background-color: {statusColor}"
        ></span>
      {/if}
      {task.id}: {task.title}
    </DialogTitle>
  </div>
</DialogHeader>
