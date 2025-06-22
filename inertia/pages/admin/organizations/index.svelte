<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import AdminLayout from '@/layouts/admin_layout.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import {
    Building2,
    Users,
    FolderKanban,
    Crown,
    Calendar,
    Search
  } from 'lucide-svelte'

  interface Props {
    organizations: {
      id: string
      name: string
      description: string | null
      owner: {
        id: string
        username: string
        email: string
      }
      plan: string | null
      created_at: string
      updated_at: string
      _count: {
        members: number
        projects: number
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
      plan?: string
    }
  }

  const props: Props = $props()
  const organizations = $derived(props.organizations)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)

  let searchValue = $state('')

  $effect(() => {
    searchValue = filters.search || ''
  })

  function handleSearch() {
    router.get(
      '/admin/organizations',
      {
        search: searchValue,
        plan: filters.plan,
        page: 1,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<AdminLayout>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Tổ chức</h1>
        <p class="text-muted-foreground">Theo dõi danh sách tổ chức và tín hiệu vận hành ở cấp hệ thống.</p>
      </div>
    </div>

    <!-- Filters -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex gap-4">
          <div class="flex-1 relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo tên tổ chức..."
              class="pl-10"
              bind:value={searchValue}
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
          </div>
          <Button onclick={handleSearch}>Tìm kiếm</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Organizations Grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each organizations as org}
        <Card class="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <div class="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 class="h-6 w-6 text-primary" />
                </div>
                <div class="min-w-0 flex-1">
                  <CardTitle class="text-lg truncate">{org.name}</CardTitle>
                </div>
              </div>
            </div>
            {#if org.description}
              <CardDescription class="line-clamp-2 mt-2">
                {org.description}
              </CardDescription>
            {/if}
          </CardHeader>
          <CardContent>
            <div class="space-y-3">
              <!-- Owner -->
              <div class="flex items-center gap-2 text-sm">
                <Crown class="h-4 w-4 text-amber-500" />
                <span class="text-muted-foreground">Owner:</span>
                <span class="font-medium">{org.owner.username}</span>
              </div>

              <!-- Stats -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-t">
                <div class="flex items-center gap-2 text-sm">
                  <Users class="h-4 w-4 text-blue-500" />
                  <span class="font-medium">{org._count.members}</span>
                  <span class="text-muted-foreground">thành viên</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <FolderKanban class="h-4 w-4 text-green-500" />
                  <span class="font-medium">{org._count.projects}</span>
                  <span class="text-muted-foreground">dự án</span>
                </div>
              </div>

              <!-- Created Date -->
              <div class="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Calendar class="h-3 w-3" />
                <span>Tạo ngày {formatDate(org.created_at)}</span>
              </div>

              <!-- Actions -->
              <div class="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  class="flex-1"
                  onclick={() => {
                    router.visit(`/admin/organizations/${org.id}`)
                  }}
                >
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      {/each}
    </div>

    <!-- Empty State -->
    {#if organizations.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <Building2 class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 class="text-lg font-semibold mb-2">Không tìm thấy tổ chức</h3>
          <p class="text-muted-foreground">
            {filters.search ? 'Thử đổi từ khóa tìm kiếm.' : 'Hệ thống chưa có tổ chức nào.'}
          </p>
        </CardContent>
      </Card>
    {/if}

    <!-- Pagination -->
    {#if pagination.lastPage > 1}
      <Card>
        <CardContent class="py-4">
          <div class="flex items-center justify-between">
            <div class="text-sm text-muted-foreground">
              Hiển thị <span class="font-medium">{(pagination.currentPage - 1) * pagination.perPage + 1}</span>
              đến <span class="font-medium">{Math.min(pagination.currentPage * pagination.perPage, pagination.total)}</span>
              trên tổng <span class="font-medium">{pagination.total}</span> tổ chức
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === 1}
                onclick={() => {
                  router.visit(`/admin/organizations?page=${pagination.currentPage - 1}`)
                }}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.lastPage}
                onclick={() => {
                  router.visit(`/admin/organizations?page=${pagination.currentPage + 1}`)
                }}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
</AdminLayout>
