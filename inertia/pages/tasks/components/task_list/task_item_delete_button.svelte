<script lang="ts">
  import { Trash2 } from 'lucide-svelte'
  import type { Task } from '../../types.svelte'
  import { router } from '@inertiajs/svelte'
  import AlertDialogRoot from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogAction from '@/components/ui/alert_dialog_action.svelte'

  interface Props {
    task: Task
    currentUser: {
      id?: string | number
      role?: string
      organization_id?: string | number
    }
  }

  const { task, currentUser }: Props = $props()
  let deleteDialogOpen = $state(false)

  // Kiểm tra quyền xóa task
  const canDeleteTask = () => {
    if (!currentUser.id) {
      return false
    }

    const isSuperAdmin = currentUser.role === 'superadmin'
    if (isSuperAdmin) {
      return true
    }

    const taskOrgId = task.organization_id
    const userOrgId = currentUser.organization_id

    if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
      return false
    }

    if (currentUser.role === 'admin') {
      return true
    }

    const creatorId = task.creator_id || (task.creator && task.creator.id)
    const isCreator = Boolean(creatorId && creatorId === currentUser.id)

    if (isCreator) {
      return true
    }

    return false
  }

  const openDeleteConfirm = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    deleteDialogOpen = true
  }

  const confirmDeleteTask = () => {
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

  const hasPermission = $derived(canDeleteTask())
</script>

{#if hasPermission}
  <button
    class="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-accent hover:text-accent-foreground"
    onclick={openDeleteConfirm}
    title="Xóa nhiệm vụ"
  >
    <Trash2 class="h-3 w-3 text-red-500" />
  </button>

  <AlertDialogRoot bind:open={deleteDialogOpen}>
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
          class="bg-red-500 hover:bg-red-600"
        >
          <button onclick={confirmDeleteTask} class="w-full h-full">
            Xóa
          </button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogRoot>
{/if}
