<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building, Search, Users, ChevronLeft, ChevronRight } from 'lucide-svelte'

  import Badge from '@/components/ui/badge.svelte'
  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import { FRONTEND_PAGINATION } from '@/constants/pagination'
  import { FRONTEND_ROUTES } from '@/constants/routes'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    organizations: Organization[]
    currentOrganizationId: string | null
  }

  interface SwitchOrganizationResponse {
    success?: boolean
    message?: string
    redirect?: string
  }

  interface JoinOrganizationResponse {
    success?: boolean
    message?: string
  }

  const { organizations, currentOrganizationId }: Props = $props()

  let searchTerm = $state('')
  let currentPage = $state(1)
  const ITEMS_PER_PAGE = FRONTEND_PAGINATION.ALL_ORGANIZATIONS_ITEMS_PER_PAGE

  const filteredOrganizations = $derived(
    organizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const totalPages = $derived(Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE))
  const paginatedOrgs = $derived(
    filteredOrganizations.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    )
  )

  async function handleSwitchOrganization(id: string) {
    try {
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (!csrfToken) {
        notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
        return
      }

      const response = await fetch(FRONTEND_ROUTES.SWITCH_ORGANIZATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          organization_id: id,
        }),
        credentials: 'same-origin',
      })

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = (await response.json()) as SwitchOrganizationResponse
        if (data.success) {
          notificationStore.success(data.message ?? 'Đã chuyển đổi tổ chức thành công')
          router.visit(data.redirect ?? FRONTEND_ROUTES.TASKS, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
          })
        } else {
          notificationStore.error(data.message ?? 'Có lỗi xảy ra')
        }
      } else {
        notificationStore.success('Đã chuyển đổi tổ chức thành công')
        router.visit(FRONTEND_ROUTES.TASKS, {
          preserveState: false,
          preserveScroll: false,
          replace: true,
        })
      }
    } catch (error) {
      console.error('Lỗi khi chuyển đổi tổ chức:', error)
      notificationStore.error('Có lỗi xảy ra khi chuyển đổi tổ chức')
    }
  }

  async function handleJoinOrganization(id: string) {
    try {
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (!csrfToken) {
        notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
        return
      }

      const response = await fetch(`/organizations/${id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      })

      const data = (await response.json()) as JoinOrganizationResponse
      if (data.success) {
        notificationStore.success(data.message ?? 'Đã gửi yêu cầu tham gia thành công')
        router.reload()
      } else {
        notificationStore.error(data.message ?? 'Không thể tham gia tổ chức')
      }
    } catch (error) {
      console.error('Lỗi khi tham gia tổ chức:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    }
  }
</script>

<svelte:head>
  <title>Tất cả tổ chức</title>
</svelte:head>

<AppLayout title="Tất cả tổ chức">
  <div class="container py-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Tất cả tổ chức</h1>
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm tổ chức..."
          class="pl-10 h-8"
          bind:value={searchTerm}
          oninput={() => { currentPage = 1 }}
        />
      </div>
    </div>

    {#if filteredOrganizations.length === 0}
      <div class="text-center py-12">
        <Building class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p class="text-muted-foreground font-bold">Không tìm thấy tổ chức nào</p>
      </div>
    {:else}
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {#each paginatedOrgs as org (org.id)}
          <Card class={`border-2 shadow-neo overflow-hidden transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] ${org.id === currentOrganizationId ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader class="p-3 pb-1">
              <CardTitle class="text-sm flex items-center gap-2">
                {#if org.logo}
                  <img src={org.logo} alt={org.name} class="h-5 w-5 rounded-md" />
                {:else}
                  <Building class="h-4 w-4" />
                {/if}
                <span class="truncate font-bold">{org.name}</span>
                {#if org.id === currentOrganizationId}
                  <Badge variant="default" class="ml-auto text-xs py-0 h-4">Hiện tại</Badge>
                {/if}
              </CardTitle>
              <CardDescription class="text-xs line-clamp-2">
                {org.description ?? 'Không có mô tả'}
              </CardDescription>
            </CardHeader>
            <CardContent class="p-3 pt-0 pb-1">
              <div class="flex items-center gap-2 flex-wrap">
                {#if org.employee_count != null}
                  <span class="text-xs text-muted-foreground flex items-center gap-1">
                    <Users class="h-3 w-3" />
                    {org.employee_count}
                  </span>
                {/if}
              </div>
            </CardContent>
            <CardFooter class="p-3 pt-1 gap-1">
              <div class="flex gap-1 w-full">
                {#if org.membership_status === 'approved' || org.id === currentOrganizationId}
                  {#if org.id === currentOrganizationId}
                    <Button variant="outline" size="sm" class="flex-1 h-7 text-xs font-bold" disabled>
                      Hiện tại
                    </Button>
                  {:else}
                    <Button size="sm" class="flex-1 h-7 text-xs font-bold" onclick={() => handleSwitchOrganization(org.id)}>
                      Chuyển đổi
                    </Button>
                  {/if}
                {:else if org.membership_status === 'pending'}
                  <Button variant="outline" size="sm" class="flex-1 h-7 text-xs font-bold" disabled>
                    Đang chờ duyệt
                  </Button>
                {:else}
                  <Button size="sm" class="flex-1 h-7 text-xs font-bold" onclick={() => handleJoinOrganization(org.id)}>
                    Tham gia
                  </Button>
                {/if}
              </div>
            </CardFooter>
          </Card>
        {/each}
      </div>

      {#if totalPages > 1}
        <div class="flex justify-center items-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { currentPage = Math.max(currentPage - 1, 1) }}
            disabled={currentPage === 1}
          >
            <ChevronLeft class="h-4 w-4 mr-1" />
            Trước
          </Button>
          <span class="text-sm font-bold">{currentPage} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            class="h-8 font-bold"
            onclick={() => { currentPage = Math.min(currentPage + 1, totalPages) }}
            disabled={currentPage === totalPages}
          >
            Sau
            <ChevronRight class="h-4 w-4 ml-1" />
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</AppLayout>
