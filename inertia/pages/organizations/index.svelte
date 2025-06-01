<script lang="ts">
  import { router, page } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardFooter from '@/components/ui/card_footer.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Button from '@/components/ui/button.svelte'
  import { Building, Plus, Search, Info, Users, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import Badge from '@/components/ui/badge.svelte'
  import { toast } from 'svelte-sonner'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    plan: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    organizations: Organization[]
    currentOrganizationId: string | null
    allOrganizations?: Organization[]
  }

  const { organizations, currentOrganizationId, allOrganizations = [] }: Props = $props()

  let searchTerm = $state('')
  let allOrgsPage = $state(1)
  let userOrgsPage = $state(1)
  let selectedOrg = $state<Organization | null>(null)
  let showDetailDialog = $state(false)
  let localCurrentOrgId = $derived(currentOrganizationId)
  const orgMembershipStatus = $state<Record<string, { status: string | null }>>({})

  // Số lượng tổ chức hiển thị trên mỗi trang (2 dòng x 5 cột)
  const ITEMS_PER_PAGE = 10

  // Hàm xử lý tham gia tổ chức
  async function handleJoinOrganization(id: string) {
    try {
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

      if (!csrfToken) {
        toast.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
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

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Đã gửi yêu cầu tham gia tổ chức thành công')

        if (data.joinRequest) {
          orgMembershipStatus[id] = { status: data.joinRequest.status || 'pending' }
        }

        if (showDetailDialog) {
          showDetailDialog = false
        }
      } else {
        toast.error(data.message || 'Không thể tham gia tổ chức')

        if (data.membership && data.membership.status) {
          orgMembershipStatus[id] = { status: data.membership.status }
        }
      }
    } catch (error) {
      console.error('Lỗi khi tham gia tổ chức:', error)
      toast.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    }
  }

  // Hàm xử lý chuyển đổi tổ chức hiện tại
  async function handleSwitchOrganization(id: string) {
    try {
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

      if (!csrfToken) {
        toast.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
        return
      }

      const response = await fetch(`/switch-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          organization_id: id,
          current_path: window.location.pathname
        }),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        if (response.status === 302) {
          localCurrentOrgId = id

          if (showDetailDialog) {
            showDetailDialog = false
          }

          toast.success('Đã chuyển đổi tổ chức thành công')
          return
        }

        toast.error(`Lỗi: ${response.status} - ${response.statusText}`)
        return
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        localCurrentOrgId = id

        if (showDetailDialog) {
          showDetailDialog = false
        }

        toast.success('Đã chuyển đổi tổ chức thành công')
        return
      }

      const data = await response.json()

      if (data.success) {
        localCurrentOrgId = id

        if (showDetailDialog) {
          showDetailDialog = false
        }

        toast.success(data.message || 'Đã chuyển đổi tổ chức thành công')
      } else {
        toast.error(data.message || 'Có lỗi xảy ra khi chuyển đổi tổ chức')
      }
    } catch (error) {
      console.error('Lỗi khi chuyển đổi tổ chức:', error)
      toast.error('Có lỗi xảy ra khi chuyển đổi tổ chức')
    }
  }

  // Hàm xử lý hiển thị chi tiết tổ chức
  function handleShowDetails(org: Organization) {
    selectedOrg = org
    showDetailDialog = true
  }

  // Lọc tổ chức theo từ khóa tìm kiếm
  const filteredOrganizations = $derived(
    allOrganizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (org.description && org.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  )

  // Phân trang cho tất cả tổ chức
  const totalAllOrgsPages = $derived(Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE))
  const paginatedAllOrgs = $derived(
    filteredOrganizations.slice(
      (allOrgsPage - 1) * ITEMS_PER_PAGE,
      allOrgsPage * ITEMS_PER_PAGE
    )
  )

  // Phân trang cho tổ chức của người dùng
  const totalUserOrgsPages = $derived(Math.ceil(organizations.length / ITEMS_PER_PAGE))
  const paginatedUserOrgs = $derived(
    organizations.slice(
      (userOrgsPage - 1) * ITEMS_PER_PAGE,
      userOrgsPage * ITEMS_PER_PAGE
    )
  )

  // Kiểm tra xem người dùng đã tham gia tổ chức nào chưa
  const hasOrganizations = $derived(organizations.length > 0)

  // Hàm kiểm tra trạng thái thành viên
  function checkMembershipStatus(orgId: string) {
    // Kiểm tra nếu đã là thành viên được duyệt
    if (organizations.some(org => org.id === orgId)) {
      return { isMember: true, status: 'approved' }
    }

    // Kiểm tra trạng thái từ state (pending hoặc rejected)
    if (orgMembershipStatus[orgId]) {
      return { isMember: false, status: orgMembershipStatus[orgId].status }
    }

    // Kiểm tra membership_status từ dữ liệu tổ chức
    const org = allOrganizations?.find(o => o.id === orgId)
    if (org && org.membership_status) {
      return { isMember: org.membership_status === 'approved', status: org.membership_status }
    }

    return { isMember: false, status: null }
  }

  // Hàm render nút tham gia dựa trên trạng thái
  function renderJoinButton(org: Organization) {
    const { isMember, status } = checkMembershipStatus(org.id)

    if (isMember) {
      if (org.id === localCurrentOrgId) {
        return {
          variant: 'outline' as const,
          disabled: true,
          icon: null,
          text: 'Hiện tại'
        }
      } else {
        return {
          variant: 'default' as const,
          disabled: false,
          icon: null,
          text: 'Chuyển đổi',
          onClick: () => handleSwitchOrganization(org.id)
        }
      }
    }

    if (status === 'pending') {
      return {
        variant: 'outline' as const,
        disabled: true,
        icon: Clock,
        text: 'Đang chờ duyệt'
      }
    }

    if (status === 'rejected') {
      return {
        variant: 'outline' as const,
        disabled: false,
        icon: AlertCircle,
        text: 'Gửi lại yêu cầu',
        className: 'bg-amber-50',
        onClick: () => handleJoinOrganization(org.id)
      }
    }

    return {
      variant: 'default' as const,
      disabled: false,
      icon: null,
      text: 'Tham gia',
      onClick: () => handleJoinOrganization(org.id)
    }
  }
</script>

<svelte:head>
  <title>Danh sách tổ chức</title>
</svelte:head>

<AppLayout title="Tổ chức">
  <div class="container py-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Danh sách tổ chức</h1>
      <Button>
        <a href="/organizations/create">
          <Plus class="mr-2 h-4 w-4" />
          Tạo tổ chức mới
        </a>
      </Button>
    </div>

    {#if hasOrganizations}
      <div>
        <div class="flex justify-between items-center mb-2">
          <h2 class="text-xl font-semibold">Tổ chức của bạn</h2>

          {#if totalUserOrgsPages > 1}
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                onclick={() => { userOrgsPage = Math.max(userOrgsPage - 1, 1); }}
                disabled={userOrgsPage === 1}
              >
                <ChevronLeft class="h-3 w-3 mr-1" />
                Trước
              </Button>

              <div class="text-xs">
                <span class="font-medium">{userOrgsPage}</span> / {totalUserOrgsPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                onclick={() => { userOrgsPage = Math.min(userOrgsPage + 1, totalUserOrgsPages); }}
                disabled={userOrgsPage === totalUserOrgsPages}
              >
                Sau
                <ChevronRight class="h-3 w-3 ml-1" />
              </Button>
            </div>
          {/if}
        </div>

        <div class="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {#each paginatedUserOrgs as org (org.id)}
            <Card
              class={`overflow-hidden transition-all duration-200 hover:shadow-md ${org.id === localCurrentOrgId ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader class="p-3 pb-1">
                <CardTitle class="text-sm flex items-center gap-2">
                  {#if org.logo}
                    <img src={org.logo} alt={org.name} class="h-4 w-4 rounded-md" />
                  {:else}
                    <Building class="h-3 w-3" />
                  {/if}
                  <div class="truncate">{org.name}</div>
                </CardTitle>
                <CardDescription class="text-xs line-clamp-1">
                  {org.description || 'Không có mô tả'}
                </CardDescription>
              </CardHeader>
              <CardContent class="p-3 pt-0 pb-1">
                {#if org.plan}
                  <p class="text-xs text-muted-foreground">
                    Gói: <span class="font-medium">{org.plan}</span>
                  </p>
                {/if}
              </CardContent>
              <CardFooter class="p-3 pt-1 gap-1">
                <div class="flex gap-1 w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 h-7 text-xs"
                    onclick={() => { handleShowDetails(org); }}
                  >
                    <Info class="h-3 w-3 mr-1" />
                    Chi tiết
                  </Button>
                  {#if org.id === localCurrentOrgId}
                    <Button variant="outline" size="sm" class="flex-1 h-7 text-xs" disabled>
                      Hiện tại
                    </Button>
                  {:else}
                    <Button size="sm" class="flex-1 h-7 text-xs" onclick={() => handleSwitchOrganization(org.id)}>
                      Chuyển đổi
                    </Button>
                  {/if}
                </div>
              </CardFooter>
            </Card>
          {/each}
        </div>
      </div>
    {/if}

    <div>
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-xl font-semibold">Tất cả tổ chức có sẵn</h2>

        <div class="flex items-center gap-3">
          <div class="relative w-64">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tổ chức..."
              class="pl-10 h-8"
              bind:value={searchTerm}
              oninput={() => {
                allOrgsPage = 1 // Reset về trang 1 khi tìm kiếm
              }}
            />
          </div>

          {#if totalAllOrgsPages > 1}
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                onclick={() => { allOrgsPage = Math.max(allOrgsPage - 1, 1); }}
                disabled={allOrgsPage === 1}
              >
                <ChevronLeft class="h-3 w-3 mr-1" />
                Trước
              </Button>

              <div class="text-xs">
                <span class="font-medium">{allOrgsPage}</span> / {totalAllOrgsPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                class="h-7 text-xs"
                onclick={() => { allOrgsPage = Math.min(allOrgsPage + 1, totalAllOrgsPages); }}
                disabled={allOrgsPage === totalAllOrgsPages}
              >
                Sau
                <ChevronRight class="h-3 w-3 ml-1" />
              </Button>
            </div>
          {/if}
        </div>
      </div>

      {#if filteredOrganizations.length === 0}
        <div class="text-center py-6">
          <p class="text-muted-foreground">Không tìm thấy tổ chức nào</p>
        </div>
      {:else}
        <div class="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          {#each paginatedAllOrgs as org (org.id)}
            {@const membershipInfo = checkMembershipStatus(org.id)}
            {@const buttonConfig = renderJoinButton(org)}
            <Card class="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader class="p-3 pb-1">
                <CardTitle class="text-sm flex items-center gap-2">
                  {#if org.logo}
                    <img src={org.logo} alt={org.name} class="h-4 w-4 rounded-md" />
                  {:else}
                    <Building class="h-3 w-3" />
                  {/if}
                  <div class="truncate">{org.name}</div>
                  {#if membershipInfo.isMember}
                    <Badge variant="outline" class="ml-auto text-xs py-0 h-4 font-normal">
                      Đã tham gia
                    </Badge>
                  {/if}
                  {#if !membershipInfo.isMember && membershipInfo.status === 'pending'}
                    <Badge variant="outline" class="ml-auto text-xs py-0 h-4 font-normal bg-amber-50">
                      Đang chờ duyệt
                    </Badge>
                  {/if}
                </CardTitle>
                <CardDescription class="text-xs line-clamp-1">
                  {org.description || 'Không có mô tả'}
                </CardDescription>
              </CardHeader>
              <CardContent class="p-3 pt-0 pb-1">
                {#if org.plan}
                  <p class="text-xs text-muted-foreground">
                    Gói: <span class="font-medium">{org.plan}</span>
                  </p>
                {/if}
              </CardContent>
              <CardFooter class="p-3 pt-1 gap-1">
                <div class="flex gap-1 w-full">
                  <Button
                    size="sm"
                    variant="outline"
                    class="flex-1 h-7 text-xs"
                    onclick={() => { handleShowDetails(org); }}
                  >
                    <Info class="h-3 w-3 mr-1" />
                    Chi tiết
                  </Button>

                  <Button
                    size="sm"
                    variant={buttonConfig.variant}
                    class={`flex-1 h-7 text-xs ${buttonConfig.className || ''}`}
                    disabled={buttonConfig.disabled}
                    onclick={buttonConfig.onClick}
                  >
                    {#if buttonConfig.icon}
                      {@const IconComponent = buttonConfig.icon}
                      <IconComponent class="h-3 w-3 mr-1" />
                    {/if}
                    {buttonConfig.text}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Dialog hiển thị chi tiết tổ chức -->
  <Dialog bind:open={showDetailDialog}>
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          {#if selectedOrg?.logo}
            <img src={selectedOrg.logo} alt={selectedOrg.name} class="h-6 w-6 rounded-md" />
          {:else}
            <Building class="h-6 w-6" />
          {/if}
          <span class="text-xl">{selectedOrg?.name}</span>
          {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
            <Badge variant="outline" class="ml-2">Đã tham gia</Badge>
          {/if}
          {#if selectedOrg && !checkMembershipStatus(selectedOrg.id).isMember &&
              checkMembershipStatus(selectedOrg.id).status === 'pending'}
            <Badge variant="outline" class="ml-2 bg-amber-50">Đang chờ duyệt</Badge>
          {/if}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-3">
        <!-- Mô tả -->
        <div>
          <h3 class="text-sm font-semibold mb-1">Mô tả:</h3>
          <p class="text-sm text-muted-foreground">
            {selectedOrg?.description || 'Chưa có mô tả'}
          </p>
        </div>

        <div class="border-t my-2"></div>

        <!-- Thông tin chi tiết -->
        <div class="grid grid-cols-[120px_1fr] gap-3 items-center">
          {#if selectedOrg?.website}
            <span class="text-sm font-medium">Website:</span>
            <a
              href={selectedOrg.website}
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-blue-500 hover:underline truncate"
            >
              {selectedOrg.website}
            </a>
          {/if}

          {#if selectedOrg?.plan}
            <span class="text-sm font-medium">Gói dịch vụ:</span>
            <span class="text-sm">{selectedOrg.plan}</span>
          {/if}

          <span class="text-sm font-medium">Thành lập từ năm:</span>
          <span class="text-sm">
            {selectedOrg?.founded_date || 'Chưa có thông tin'}
          </span>

          <span class="text-sm font-medium">Chủ sở hữu:</span>
          <span class="text-sm">
            {selectedOrg?.owner || 'Chưa có thông tin'}
          </span>

          <span class="text-sm font-medium">Số nhân viên:</span>
          <span class="text-sm">
            {selectedOrg?.employee_count ? `${selectedOrg.employee_count} thành viên` : 'Chưa có thông tin'}
          </span>

          <span class="text-sm font-medium">Số dự án:</span>
          <span class="text-sm">
            {selectedOrg?.project_count ? `${selectedOrg.project_count} dự án` : 'Chưa có thông tin'}
          </span>

          {#if selectedOrg?.industry}
            <span class="text-sm font-medium">Lĩnh vực:</span>
            <span class="text-sm">{selectedOrg.industry}</span>
          {/if}

          {#if selectedOrg?.location}
            <span class="text-sm font-medium">Địa điểm:</span>
            <span class="text-sm">{selectedOrg.location}</span>
          {/if}

          <span class="text-sm font-medium">Trạng thái:</span>
          <span class="text-sm">
            {#if selectedOrg && checkMembershipStatus(selectedOrg.id).isMember}
              <span class="text-green-500 font-medium">Đã tham gia</span>
            {:else}
              <span class="text-amber-500 font-medium">Chưa tham gia</span>
            {/if}
          </span>
        </div>
      </div>

      <DialogFooter class="gap-3 flex-row sm:justify-between border-t pt-4">
        {#if selectedOrg}
          {@const membershipInfo = checkMembershipStatus(selectedOrg.id)}
          {#if membershipInfo.isMember}
            {#if selectedOrg.id === localCurrentOrgId}
              <Button variant="outline" disabled>
                <Building class="mr-2 h-4 w-4" />
                Hiện tại
              </Button>
            {:else}
              <Button onclick={() => handleSwitchOrganization(selectedOrg.id)}>
                <Building class="mr-2 h-4 w-4" />
                Chuyển đổi
              </Button>
            {/if}
          {:else if membershipInfo.status === 'pending'}
            <Button variant="outline" disabled>
              <Clock class="mr-2 h-4 w-4" />
              Đang chờ duyệt
            </Button>
          {:else}
            <Button onclick={() => handleJoinOrganization(selectedOrg.id)}>
              <Users class="mr-2 h-4 w-4" />
              Tham gia tổ chức
            </Button>
          {/if}

          <Button variant="outline" onclick={() => { showDetailDialog = false; }}>
            Đóng
          </Button>
        {/if}
      </DialogFooter>
    </DialogContent>
  </Dialog>
</AppLayout>
