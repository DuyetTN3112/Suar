<script lang="ts">
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import type { Task } from '../../types'

  interface Props {
    task: Task
  }

  const { task }: Props = $props()
</script>

<DialogHeader class="flex flex-row items-center">
  <div class="flex-1">
    <DialogTitle class="text-xl flex items-center gap-2">
      {#if task.status}
        <span
          class="inline-block w-3 h-3 rounded-full mr-2"
          style="background-color: {task.status.color}"
        ></span>
      {/if}
      {task.id}: {task.title}
    </DialogTitle>
  </div>
</DialogHeader>
