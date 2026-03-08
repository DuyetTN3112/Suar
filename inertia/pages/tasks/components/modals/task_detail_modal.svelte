<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import type { Task } from '../../types.svelte'

  interface Props {
    open: boolean
    onOpenChange?: (open: boolean) => void
    task: Task | null
    statuses?: Array<{ value: string; label: string; color: string }>
    priorities?: Array<{ value: string; label: string; color: string }>
    labels?: Array<{ value: string; label: string; color: string }>
    users?: Array<{ id: string; username: string; email: string }>
    onUpdate?: (updatedTask: Task) => void
    currentUser?: unknown
  }

  let {
    open = $bindable(false),
    onOpenChange,
    task,
    statuses = [],
    priorities = [],
    labels = [],
    users = [],
    onUpdate,
    currentUser = {}
  }: Props = $props()

  const handleClose = () => {
    if (onOpenChange) {
      onOpenChange(false)
    }
  }
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-175 max-h-[90vh] overflow-y-auto">
    {#if task}
      <DialogHeader>
        <DialogTitle>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium text-muted-foreground">#{task.id}</span>
            {#if task.status}
              <span
                class="inline-block w-3 h-3 rounded-full"
                style:background-color={task.status.color}
              ></span>
            {/if}
            <span class="line-clamp-1">{task.title}</span>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div>
          <h4 class="text-sm font-medium mb-2">Mô tả</h4>
          <p class="text-sm text-muted-foreground">{task.description || 'Không có mô tả'}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          {#if task.status}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1">Trạng thái</h4>
              <div class="text-sm">
                {task.status}
              </div>
            </div>
          {/if}

          {#if task.priority}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1">Độ ưu tiên</h4>
              <div class="text-sm">
                {task.priority}
              </div>
            </div>
          {/if}

          {#if task.label}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1">Nhãn</h4>
              <div class="text-sm">
                {task.label}
              </div>
            </div>
          {/if}

          {#if task.assignee}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1">Người thực hiện</h4>
              <div class="text-sm">
                {task.assignee.username || task.assignee.email}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </DialogContent>
</Dialog>
