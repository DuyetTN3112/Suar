<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { GitBranch, Plus, GripVertical, Trash2 } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'


  interface Props {
    taskStatuses: {
      id: string
      name: string
      color: string
      order: number
      is_default: boolean
    }[]
  }

  const props: Props = $props()
  const taskStatuses = $derived(props.taskStatuses)

  let createFormOpen = $state(false)
  let isSubmitting = $state(false)
  let deletingId = $state<string | null>(null)
  let formData = $state({
    name: '',
    category: 'in_progress',
    color: '#6B7280',
  })
  let errorMessage = $state('')

  function getCsrfToken(): string {
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
  }

  async function handleCreateStatus() {
    if (!formData.name.trim()) {
      errorMessage = 'Tên trạng thái là bắt buộc.'
      return
    }

    isSubmitting = true
    errorMessage = ''

    try {
      const response = await fetch('/api/task-statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          color: formData.color,
        }),
        credentials: 'same-origin',
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        errorMessage = payload.message ?? 'Không thể tạo trạng thái mới.'
        isSubmitting = false
        return
      }

      createFormOpen = false
      formData = {
        name: '',
        category: 'in_progress',
        color: '#6B7280',
      }
      router.reload()
    } catch (error) {
      console.error('Lỗi khi tạo trạng thái:', error)
      errorMessage = 'Không thể tạo trạng thái mới.'
      isSubmitting = false
    }
  }

  async function handleDeleteStatus(statusId: string) {
    if (!window.confirm('Bạn có chắc chắn muốn xoá trạng thái này không?')) {
      return
    }

    deletingId = statusId
    errorMessage = ''

    try {
      const response = await fetch(`/api/task-statuses/${statusId}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        errorMessage = payload.message ?? 'Không thể xoá trạng thái.'
        deletingId = null
        return
      }

      router.reload()
    } catch (error) {
      console.error('Lỗi khi xoá trạng thái:', error)
      errorMessage = 'Không thể xoá trạng thái.'
      deletingId = null
    }
  }

  function categoryLabel(category: string): string {
    switch (category) {
      case 'todo':
        return 'To do'
      case 'done':
        return 'Done'
      case 'cancelled':
        return 'Cancelled'
      default:
        return 'In progress'
    }
  }
</script>

<OrganizationLayout title="Workflow tổ chức">
  <div class="space-y-6 max-w-4xl">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="neo-kicker">Organization / Workflow</p>
        <h1 class="text-4xl font-bold tracking-tight">Workflow task</h1>
        <p class="mt-2 text-sm text-muted-foreground">Quản lý các cột trạng thái mà board task của tổ chức đang sử dụng.</p>
      </div>
      <Button onclick={() => { createFormOpen = !createFormOpen }}>
        <Plus class="mr-2 h-4 w-4" />
        {createFormOpen ? 'Đóng form' : 'Thêm trạng thái'}
      </Button>
    </div>

    {#if createFormOpen}
      <Card>
        <CardHeader>
          <CardTitle>Tạo trạng thái mới</CardTitle>
          <CardDescription>
            Trạng thái mới sẽ xuất hiện trong workflow của tổ chức và được dùng ngay ở Kanban board.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2 md:col-span-2">
              <Label for="status_name">Tên trạng thái</Label>
              <Input
                id="status_name"
                value={formData.name}
                oninput={(event: Event) => {
                  formData.name = (event.currentTarget as HTMLInputElement).value
                }}
                placeholder="Ví dụ: Chờ QA"
              />
            </div>

            <div class="space-y-2">
              <Label for="status_color">Màu sắc</Label>
              <Input
                id="status_color"
                type="color"
                value={formData.color}
                oninput={(event: Event) => {
                  formData.color = (event.currentTarget as HTMLInputElement).value
                }}
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="status_category">Nhóm trạng thái</Label>
            <Select
              value={formData.category}
              onValueChange={(value: string) => {
                formData.category = value
              }}
            >
              <SelectTrigger id="status_category">
                <span>{categoryLabel(formData.category)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {#if errorMessage}
            <p class="text-sm neo-text-orange">{errorMessage}</p>
          {/if}

          <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => { createFormOpen = false }}>
              Hủy
            </Button>
            <Button onclick={() => { void handleCreateStatus() }} disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo trạng thái'}
            </Button>
          </div>
        </CardContent>
      </Card>
    {/if}

    <Card>
      <CardHeader>
        <div class="flex items-center gap-2">
          <GitBranch class="h-5 w-5" />
          <CardTitle>Danh sách trạng thái</CardTitle>
        </div>
        <CardDescription>
          Trạng thái hệ thống được giữ cố định. Trạng thái custom có thể xoá nếu không còn task sử dụng.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each taskStatuses as status}
            <div class="flex items-center gap-3 rounded-lg border p-3">
              <div class="text-muted-foreground">
                <GripVertical class="h-5 w-5" />
              </div>
              <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style="background-color: {status.color}20; border: 2px solid {status.color}"
              >
                <div class="h-3 w-3 rounded-full" style="background-color: {status.color}"></div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium">{status.name}</span>
                  {#if status.is_default}
                    <span class="neo-pill-soft rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                      Hệ thống
                    </span>
                  {/if}
                </div>
                <p class="text-xs text-muted-foreground">Thứ tự: {status.order}</p>
              </div>
              {#if !status.is_default}
                <Button
                  size="sm"
                  variant="destructive"
                  onclick={() => { void handleDeleteStatus(status.id) }}
                  disabled={deletingId === status.id}
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              {/if}
            </div>
          {/each}
        </div>

        {#if taskStatuses.length === 0}
          <div class="py-12 text-center">
            <GitBranch class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 class="mb-2 text-lg font-semibold">Chưa có trạng thái nào</h3>
            <p class="mb-4 text-muted-foreground">
              Hãy thêm trạng thái đầu tiên để workflow của tổ chức phản ánh đúng quy trình làm việc.
            </p>
            <Button onclick={() => { createFormOpen = true }}>
              <Plus class="mr-2 h-4 w-4" />
              Thêm trạng thái
            </Button>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
