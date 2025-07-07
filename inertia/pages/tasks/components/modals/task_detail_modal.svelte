<script lang="ts">
  /* eslint-disable prefer-const */
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'

  import type { Task } from '../../types.svelte'

  interface Props {
    open: boolean
    onOpenChange?: (open: boolean) => void
    task: Task | null
    statuses?: { value: string; label: string; color: string }[]
    priorities?: { value: string; label: string; color: string }[]
    labels?: { value: string; label: string; color: string }[]
    users?: { id: string; username: string; email: string }[]
    onUpdate?: (updatedTask: Task) => void
    currentUser?: unknown
  }

  let {
    open = $bindable(false),
    onOpenChange,
    task,
    statuses = [],
    priorities: _priorities = [],
    labels: _labels = [],
    users: _users = [],
    onUpdate: _onUpdate,
    currentUser: _currentUser = {},
  }: Props = $props()

  const currentStatus = $derived(
    task ? statuses.find((status) => status.value === task.task_status_id) : undefined
  )
</script>

<Dialog bind:open onOpenChange={onOpenChange}>
  <DialogContent class="sm:max-w-175 max-h-[90vh] overflow-y-auto">
    {#if task}
        <DialogHeader>
          <DialogTitle>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-muted-foreground">#{task.id}</span>
              {#if currentStatus}
                <span
                  class="inline-block w-3 h-3 rounded-full"
                  style:background-color={currentStatus.color || '#888'}
                ></span>
              {/if}
              <span class="line-clamp-1">{task.title}</span>
            </div>
          </DialogTitle>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <div>
          <h4 class="text-sm font-medium mb-2">Mô tả</h4>
          <p class="text-sm text-muted-foreground">{task.description ?? 'Không có mô tả'}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          {#if task.status || currentStatus}
            <div>
              <h4 class="text-xs font-medium text-muted-foreground mb-1">Trạng thái</h4>
              <div class="text-sm">
                {currentStatus?.label ?? task.status}
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
