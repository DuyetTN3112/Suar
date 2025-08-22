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
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'


  import ProjectGrid from './components/project_grid.svelte'

  type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

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

  const props: Props = $props()
  const projects = $derived(props.projects)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)
  let searchValue = $state('')
  let createFormOpen = $state(false)
  let isSubmitting = $state(false)
  let errorMessage = $state('')
  let formData = $state({
    name: '',
    description: '',
    status: 'active',
  })

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

  function getStatusBadge(status: string): BadgeVariant {
    const variants = {
      active: 'default',
      archived: 'secondary',
      on_hold: 'outline',
    } as const
    return variants[status as keyof typeof variants]
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
        errorMessage = payload.message ?? 'Không thể tạo dự án.'
        isSubmitting = false
        return
      }

      createFormOpen = false
      formData = {
        name: '',
        description: '',
        status: 'active',
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
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="neo-kicker">Organization / Projects</p>
        <h1 class="text-4xl font-bold tracking-tight">Dự án</h1>
        <p class="mt-2 text-sm text-muted-foreground">Quản lý danh sách dự án nội bộ của tổ chức và mở nhanh sang màn project chi tiết.</p>
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
            <p class="text-sm neo-text-orange">{errorMessage}</p>
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
