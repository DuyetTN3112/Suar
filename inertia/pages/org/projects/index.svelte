<script lang="ts">
  import { inertia } from '@inertiajs/svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import { FolderKanban, Users, CheckSquare, Plus, Search, ArrowUpRight } from 'lucide-svelte'

  interface Props {
    projects: {
      id: string
      name: string
      description: string | null
      status: 'active' | 'archived' | 'on_hold'
      created_at: string
      _count: {
        members: number
        tasks: number
      }
    }[]
    pagination: {
      total: number
      perPage: number
      currentPage: number
      lastPage: number
    }
    filters: {
      search?: string
      status?: string
    }
  }

  const { projects, pagination, filters }: Props = $props()
  let searchValue = $state(filters.search || '')
  let createFormOpen = $state(false)
  let isSubmitting = $state(false)
  let errorMessage = $state('')
  let formData = $state({
    name: '',
    description: '',
    status: 'active',
  })

  function handleSearch() {
    inertia.get(
      '/org/projects',
      {
        search: searchValue,
        page: 1,
      },
      {
        preserveState: true,
      }
    )
  }

  function getCsrfToken(): string {
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  function getStatusBadge(status: string) {
    const variants = {
      active: 'default',
      archived: 'secondary',
      on_hold: 'outline',
    }
    return variants[status as keyof typeof variants] || 'secondary'
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Đang chạy'
      case 'archived':
        return 'Lưu trữ'
      case 'on_hold':
        return 'Tạm dừng'
      default:
        return status
    }
  }

  async function handleCreateProject() {
    if (!formData.name.trim()) {
      errorMessage = 'Tên dự án là bắt buộc.'
      return
    }

    isSubmitting = true
    errorMessage = ''

    try {
      const response = await fetch('/org/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          status: formData.status,
        }),
      })

      const payload = (await response.json()) as {
        success?: boolean
        message?: string
      }

      if (!response.ok || !payload.success) {
        errorMessage = payload.message || 'Không thể tạo dự án.'
        isSubmitting = false
        return
      }

      createFormOpen = false
      formData = {
        name: '',
        description: '',
        status: 'active',
      }
      inertia.reload({ preserveScroll: true })
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error)
      errorMessage = 'Không thể tạo dự án.'
      isSubmitting = false
    }
  }
</script>

<OrganizationLayout title="Dự án tổ chức">
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Dự án</h1>
        <p class="text-muted-foreground">Quản lý danh sách dự án nội bộ của tổ chức và mở nhanh sang màn project chi tiết.</p>
      </div>
      <Button onclick={() => { createFormOpen = !createFormOpen }}>
        <Plus class="mr-2 h-4 w-4" />
        {createFormOpen ? 'Đóng form' : 'Tạo dự án'}
      </Button>
    </div>

    {#if createFormOpen}
      <Card>
        <CardHeader>
          <CardTitle>Tạo dự án mới</CardTitle>
          <CardDescription>
            Batch frontend này dùng form tạo nhanh trong namespace <code>/org</code> thay vì điều hướng sang route chưa có riêng.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label for="project_name">Tên dự án</Label>
            <Input
              id="project_name"
              value={formData.name}
              oninput={(event: Event) => {
                formData.name = (event.currentTarget as HTMLInputElement).value
              }}
              placeholder="Ví dụ: Marketplace Revamp Q2"
            />
          </div>

          <div class="space-y-2">
            <Label for="project_description">Mô tả</Label>
            <Textarea
              id="project_description"
              value={formData.description}
              rows={4}
              oninput={(event: Event) => {
                formData.description = (event.currentTarget as HTMLTextAreaElement).value
              }}
              placeholder="Mục tiêu, phạm vi, team liên quan, kết quả mong đợi..."
            />
          </div>

          <div class="space-y-2">
            <Label for="project_status">Trạng thái ban đầu</Label>
            <Select
              value={formData.status}
              onValueChange={(value: string) => {
                formData.status = value
              }}
            >
              <SelectTrigger id="project_status">
                <span>{statusLabel(formData.status)}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Đang chạy</SelectItem>
                <SelectItem value="on_hold">Tạm dừng</SelectItem>
                <SelectItem value="archived">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {#if errorMessage}
            <p class="text-sm text-red-600">{errorMessage}</p>
          {/if}

          <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => { createFormOpen = false }}>
              Hủy
            </Button>
            <Button onclick={() => { void handleCreateProject() }} disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo dự án'}
            </Button>
          </div>
        </CardContent>
      </Card>
    {/if}

    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên hoặc mô tả dự án..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(event: KeyboardEvent) => event.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each projects as project}
        <Card class="transition-shadow hover:shadow-lg">
          <CardHeader>
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 flex-1 items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FolderKanban class="h-5 w-5 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <CardTitle class="truncate text-lg">{project.name}</CardTitle>
                  <Badge variant={getStatusBadge(project.status)} class="mt-1">
                    {statusLabel(project.status)}
                  </Badge>
                </div>
              </div>
            </div>
            {#if project.description}
              <CardDescription class="mt-2 line-clamp-2">
                {project.description}
              </CardDescription>
            {/if}
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center gap-2 text-sm">
                <Users class="h-4 w-4 text-blue-500" />
                <span class="font-medium">{project._count.members}</span>
                <span class="text-muted-foreground">thành viên</span>
              </div>
              <div class="flex items-center gap-2 text-sm">
                <CheckSquare class="h-4 w-4 text-green-500" />
                <span class="font-medium">{project._count.tasks}</span>
                <span class="text-muted-foreground">task</span>
              </div>
            </div>

            <Button
              variant="outline"
              class="w-full"
              onclick={() => {
                inertia.visit(`/projects/${project.id}`)
              }}
            >
              <ArrowUpRight class="mr-2 h-4 w-4" />
              Mở chi tiết dự án
            </Button>
          </CardContent>
        </Card>
      {/each}
    </div>

    {#if projects.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <FolderKanban class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 class="mb-2 text-lg font-semibold">Chưa có dự án nào</h3>
          <p class="mb-4 text-muted-foreground">
            Tạo dự án đầu tiên để tổ chức bắt đầu gom task, thành viên và workflow theo ngữ cảnh rõ ràng.
          </p>
          <Button onclick={() => { createFormOpen = true }}>
            <Plus class="mr-2 h-4 w-4" />
            Tạo dự án
          </Button>
        </CardContent>
      </Card>
    {/if}

    {#if pagination.lastPage > 1}
      <Card>
        <CardContent class="py-4 text-sm text-muted-foreground">
          Hiển thị trang {pagination.currentPage} / {pagination.lastPage} với tổng {pagination.total} dự án.
        </CardContent>
      </Card>
    {/if}
  </div>
</OrganizationLayout>
