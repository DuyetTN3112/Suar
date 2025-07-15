<script lang="ts">
  import { Save, Trash2, CircleCheckBig, CircleAlert } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'

  import type { Task } from '../../../types.svelte'

  interface TaskActionResponse {
    data?: Task
    errors?: Record<string, string>
  }

  interface Props {
    task: Task
    formData: Partial<Task>
    submitting: boolean
    setSubmitting: (value: boolean) => void
    setErrors: (errors: Record<string, string>) => void
    onUpdate?: (updatedTask: Task | null) => void
    onSubmit: () => void
    canMarkAsCompleted?: boolean
    canDelete?: boolean
    completedStatus?: string
  }

  const {
    task,
    formData: _formData,
    submitting,
    setSubmitting,
    setErrors,
    onUpdate,
    onSubmit,
    canMarkAsCompleted = false,
    canDelete = false,
    completedStatus = 'done',
  }: Props = $props()

  async function handleMarkCompleted() {
    if (!task.id) return

    setSubmitting(true)

    try {
      const response = await fetch(`/tasks/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
        },
        body: JSON.stringify({ task_status_id: completedStatus }),
      })

      if (response.ok) {
        const payload = (await response.json()) as TaskActionResponse
        if (onUpdate && payload.data) {
          onUpdate(payload.data)
        }
      } else {
        const payload = (await response.json()) as TaskActionResponse
        setErrors(payload.errors ?? {})
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái nhiệm vụ:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!task.id || !window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) return

    setSubmitting(true)

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN':
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
        },
      })

      if (response.ok) {
        if (onUpdate) {
          onUpdate(null)
        }
      } else {
        const payload = (await response.json()) as TaskActionResponse
        setErrors(payload.errors ?? {})
        console.error('Lỗi khi xóa nhiệm vụ:', payload)
      }
    } catch (error) {
      console.error('Lỗi khi xóa nhiệm vụ:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const isTaskCompleted = $derived(
    task.task_status_id === completedStatus || task.status === completedStatus
  )
</script>

<div class="flex justify-between gap-2 mt-4">
  <div class="flex-1">
    {#if canDelete}
      <button
        type="button"
        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2 mr-2"
        onclick={handleDelete}
        disabled={submitting}
      >
        <Trash2 class="h-4 w-4 mr-1" />
        Xóa nhiệm vụ
      </button>
    {/if}
  </div>

  <div class="flex gap-2">
    {#if canMarkAsCompleted && !isTaskCompleted}
      <Button
        variant="outline"
        onclick={handleMarkCompleted}
        disabled={submitting}
        class="border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      >
        <CircleCheckBig class="h-4 w-4 mr-1" />
        Hoàn thành
      </Button>
    {/if}

    {#if canMarkAsCompleted && isTaskCompleted}
      <Button
        variant="outline"
        onclick={() => { alert('Chức năng này đang được phát triển') }}
        disabled={submitting}
        class="border-orange-500 text-orange-500 hover:bg-orange-50"
      >
        <CircleAlert class="h-4 w-4 mr-1" />
        Mở lại nhiệm vụ
      </Button>
    {/if}

    <Button
      onclick={onSubmit}
      disabled={submitting}
    >
      <Save class="h-4 w-4 mr-1" />
      {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
    </Button>
  </div>
</div>
