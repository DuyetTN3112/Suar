<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Plus, Search } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'


  import ProjectGrid from './components/project_grid.svelte'

  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'pending' | 'warning'

  interface Props {
    projects: {
      id: string
      name: string
      description: string | null
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
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

  const props: Props = $props()
  const projects = $derived(props.projects)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)
  let searchValue = $state('')
  let createFormOpen = $state(false)
  let isSubmitting = $state(false)
  let errorMessage = $state('')
  let formData = $state<{ name: string; description: string; status: ProjectStatus }>({
    name: '',
    description: '',
    status: 'pending',
  })

  type ProjectStatus = Props['projects'][number]['status']

  $effect(() => {
    searchValue = filters.search ?? ''
  })

  function handleSearch() {
    router.get(
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
    return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
  }

  function getStatusBadge(status: ProjectStatus): BadgeVariant {
    const variants = {
      pending: 'default',
      in_progress: 'pending',
      completed: 'secondary',
      cancelled: 'warning',
    } as const
    return variants[status]
  }

  function statusLabel(status: ProjectStatus): string {
    switch (status) {
      case 'pending':
        return 'Chờ bắt đầu'
      case 'in_progress':
        return 'Đang chạy'
      case 'completed':
        return 'Hoàn thành'
      case 'cancelled':
        return 'Đã hủy'
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
        errorMessage = payload.message ?? 'Không thể tạo dự án.'
        isSubmitting = false
        return
      }

      createFormOpen = false
      formData = {
        name: '',
        description: '',
        status: 'pending',
      }
      router.reload()
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error)
      errorMessage = 'Không thể tạo dự án.'
      isSubmitting = false
    }
  }
</script>

<OrganizationLayout title="Dự án tổ chức">
  <div class="space-y-6">
    <div class="rounded-3xl border border-border bg-card p-5 shadow-suar-xs sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="font-mono text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Org projects surface</p>
          <h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Dự án tổ chức</h1>
          <p class="mt-3 text-sm leading-6 text-muted-foreground">
            Quản lý project trong workspace tổ chức: thành viên, task và workflow cùng một ngữ cảnh. Đây không phải user project cá nhân.
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="rounded-2xl border border-dashed border-black/20 px-4 py-3 text-sm">
            <span class="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Tổng dự án</span>
            <strong class="mt-1 block text-2xl">{pagination.total}</strong>
          </div>
          <Button onclick={() => { createFormOpen = !createFormOpen }}>
            <Plus class="mr-2 h-4 w-4" />
            {createFormOpen ? 'Đóng form' : 'Tạo dự án tổ chức'}
          </Button>
        </div>
      </div>
    </div>

    {#if createFormOpen}
      <Card>
        <CardHeader>
          <CardTitle>Tạo dự án mới</CardTitle>
          <CardDescription>
            Tạo project trong organization workspace hiện tại. Thành viên tổ chức sẽ thấy project theo quyền của họ.
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
            <select
              id="project_status"
              class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={formData.status}
              onchange={(event) => {
                formData.status = event.currentTarget.value as ProjectStatus
              }}
            >
              <option value="pending">Chờ bắt đầu</option>
              <option value="in_progress">Đang chạy</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {#if errorMessage}
            <p class="text-sm text-primary">{errorMessage}</p>
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
        <div class="flex flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên hoặc mô tả dự án..."
              class="pl-10"
              value={searchValue}
              oninput={(event: Event) => {
                searchValue = (event.currentTarget as HTMLInputElement).value
              }}
              onkeydown={(event: KeyboardEvent) => { if (event.key === 'Enter') handleSearch() }}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <ProjectGrid
      {projects}
      {pagination}
      {getStatusBadge}
      {statusLabel}
      onCreateProject={() => {
        createFormOpen = true
      }}
    />
  </div>
</OrganizationLayout>
