<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { TaskItemProps } from '../../types'
  import { Trash2 } from 'lucide-svelte'
  import Button from '@/components/ui/button.svelte'
  import { canDeleteTask } from '../../utils/task_permissions'
  import TaskDetailModal from '../modals/task_detail_modal.svelte'
  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogAction from '@/components/ui/alert_dialog_action.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'

  const {
    task,
    completedStatus,
    statuses = [],
    priorities = [],
    labels = [],
    users = [],
    currentUser
  }: TaskItemProps = $props()

  const isCompleted = $derived(task.status === completedStatus)

  let showDetailModal = $state(false)
  let deleteDialogOpen = $state(false)

  function handleTaskUpdate() {
    // Handle task update
  }

  function openTaskDetail(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    showDetailModal = true
  }

  function openDeleteConfirm(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    deleteDialogOpen = true
  }

  function confirmDeleteTask() {
    router.delete(`/tasks/${task.id}`, {
      onSuccess: () => {
        deleteDialogOpen = false
      },
      onError: (errors: unknown) => {
        console.error('Lỗi khi xóa task:', errors)
        alert('Có lỗi xảy ra khi xóa nhiệm vụ. Vui lòng thử lại.')
      },
      preserveScroll: true,
      preserveState: false,
      replace: true,
      only: ['tasks']
    })
  }
</script>

<div class="flex items-center justify-between w-full">
  <div
    class="flex-1 cursor-pointer"
    onclick={openTaskDetail}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && openTaskDetail(e)}
  >
    <div class="flex flex-col">
      <span class="text-xs {isCompleted ? 'line-through text-muted-foreground' : ''}">
        {task.title}
      </span>
      {#if task.description}
        <span class="text-xs text-muted-foreground line-clamp-1 mt-1">
          {task.description}
        </span>
      {/if}
    </div>
  </div>

  {#if canDeleteTask(task, currentUser)}
    <Button
      variant="ghost"
      size="icon"
      class="h-5 w-5 ml-2"
      onclick={openDeleteConfirm}
      title="Xóa nhiệm vụ"
    >
      <Trash2 class="h-3 w-3 text-red-500" />
    </Button>
  {/if}
</div>

<TaskDetailModal
  bind:open={showDetailModal}
  {task}
  {statuses}
  {priorities}
  {labels}
  {users}
  onUpdate={handleTaskUpdate}
  {currentUser}
/>

<AlertDialog bind:open={deleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Xác nhận xóa nhiệm vụ</AlertDialogTitle>
      <AlertDialogDescription>
        Bạn có chắc chắn muốn xóa nhiệm vụ "{task.title}"?
        Hành động này không thể hoàn tác.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Hủy</AlertDialogCancel>
      <AlertDialogAction
        onclick={confirmDeleteTask}
        class="bg-red-500 hover:bg-red-600"
      >
        Xóa
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
