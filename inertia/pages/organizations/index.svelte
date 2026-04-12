<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Plus, Clock, CircleAlert } from 'lucide-svelte'

  import Button from '@/components/ui/button.svelte'
  import { FRONTEND_PAGINATION } from '@/constants/pagination'
  import { FRONTEND_ROUTES } from '@/constants/routes'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'

  import OrganizationAvailableSection from './components/organization_available_section.svelte'
  import OrganizationDetailDialog from './components/organization_detail_dialog.svelte'
  import OrganizationUserMembershipsSection from './components/organization_user_memberships_section.svelte'
  import { joinOrganizationRequest, switchOrganizationRequest } from './organizations_api'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
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
    allOrganizations?: Organization[]
    currentOrganizationId: string | null
  }

  const { organizations, allOrganizations = [], currentOrganizationId }: Props = $props()

  let searchTerm = $state('')
  let allOrgsPage = $state(1)
  let userOrgsPage = $state(1)
  let selectedOrg = $state<Organization | null>(null)
  let showDetailDialog = $state(false)
  let localCurrentOrgId = $state<string | null>(null)
  const orgMembershipStatus = $state<Partial<Record<string, { status: string | null }>>>({})

  $effect(() => {
    localCurrentOrgId = currentOrganizationId
  })

  const ITEMS_PER_PAGE = FRONTEND_PAGINATION.ORGANIZATIONS_ITEMS_PER_PAGE

  async function handleJoinOrganization(id: string) {
    try {
      const data = await joinOrganizationRequest(id)
      if (!data.success) {
        notificationStore.error(data.message ?? 'Không thể tham gia tổ chức')
        if (data.membership?.status) {
          orgMembershipStatus[id] = { status: data.membership.status }
        }
        return
      }

      notificationStore.success(data.message ?? 'Đã gửi yêu cầu tham gia tổ chức thành công')
      if (data.joinRequest) {
        orgMembershipStatus[id] = { status: data.joinRequest.status ?? 'pending' }
      }
      if (showDetailDialog) {
        showDetailDialog = false
      }
    } catch (error) {
      if ((error as Error).message === 'missing-csrf-token') {
        notificationStore.error('Không tìm thấy CSRF token. Vui lòng tải lại trang.')
        return
      }
      console.error('Lỗi khi tham gia tổ chức:', error)
      notificationStore.error('Đã xảy ra lỗi khi xử lý yêu cầu')
    }
  }

  async function handleSwitchOrganization(id: string) {
    if (!id || id === localCurrentOrgId) return

    try {
      const { ok, data } = await switchOrganizationRequest(FRONTEND_ROUTES.SWITCH_ORGANIZATION, id)
      if (!ok || !data.success) {
        notificationStore.error(data.message ?? 'Có lỗi xảy ra khi chuyển đổi tổ chức')
        return
      }

      localCurrentOrgId = id
      if (showDetailDialog) {
        showDetailDialog = false
      }
      notificationStore.success(data.message ?? 'Đã chuyển đổi tổ chức thành công')
      router.visit(data.redirect ?? FRONTEND_ROUTES.TASKS, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch {
      notificationStore.error('Có lỗi xảy ra khi chuyển đổi tổ chức')
    }
  }

  function handleAllOrgsSearchInput() {
    allOrgsPage = 1
  }

  function handleShowDetails(org: Organization) {
    selectedOrg = org
    showDetailDialog = true
  }

  const filteredOrganizations = $derived(
    allOrganizations.filter((org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  const totalAllOrgsPages = $derived(Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE))
  const paginatedAllOrgs = $derived(
    filteredOrganizations.slice(
      (allOrgsPage - 1) * ITEMS_PER_PAGE,
      allOrgsPage * ITEMS_PER_PAGE
    )
  )

  const totalUserOrgsPages = $derived(Math.ceil(organizations.length / ITEMS_PER_PAGE))
  const paginatedUserOrgs = $derived(
    organizations.slice(
      (userOrgsPage - 1) * ITEMS_PER_PAGE,
      userOrgsPage * ITEMS_PER_PAGE
    )
  )

  const hasOrganizations = $derived(organizations.length > 0)

  function checkMembershipStatus(orgId: string) {
    if (organizations.some((org) => org.id === orgId)) {
      return { isMember: true, status: 'approved' }
    }

    if (orgMembershipStatus[orgId] !== undefined) {
      return { isMember: false, status: orgMembershipStatus[orgId].status }
    }

    const org = allOrganizations.find((o) => o.id === orgId)
    if (org?.membership_status) {
      return { isMember: org.membership_status === 'approved', status: org.membership_status }
    }

    return { isMember: false, status: null }
  }

  function renderJoinButton(org: Organization) {
    const { isMember, status } = checkMembershipStatus(org.id)

    if (isMember) {
      if (org.id === localCurrentOrgId) {
        return {
          variant: 'outline' as const,
          disabled: true,
          icon: null,
          text: 'Hiện tại',
        }
      } else {
        return {
          variant: 'default' as const,
          disabled: false,
          icon: null,
          text: 'Chuyển đổi',
          onClick: () => {
            void handleSwitchOrganization(org.id)
          },
        }
      }
    }

    if (status === 'pending') {
      return {
        variant: 'outline' as const,
        disabled: true,
        icon: Clock,
        text: 'Đang chờ duyệt',
      }
    }

    if (status === 'rejected') {
      return {
        variant: 'outline' as const,
        disabled: false,
        icon: CircleAlert,
        text: 'Gửi lại yêu cầu',
        className: 'bg-amber-50',
        onClick: () => handleJoinOrganization(org.id),
      }
    }

    return {
      variant: 'default' as const,
      disabled: false,
      icon: null,
      text: 'Tham gia',
      onClick: () => handleJoinOrganization(org.id),
    }
  }

</script>

<svelte:head>
  <title>Danh sách tổ chức</title>
</svelte:head>

<AppLayout title="Tổ chức">
  <div class="container px-4 py-4 space-y-4 md:px-6">
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
      <OrganizationUserMembershipsSection
        page={userOrgsPage}
        totalPages={totalUserOrgsPages}
        organizations={paginatedUserOrgs}
        currentOrganizationId={localCurrentOrgId}
        onPrev={() => { userOrgsPage = Math.max(userOrgsPage - 1, 1) }}
        onNext={() => { userOrgsPage = Math.min(userOrgsPage + 1, totalUserOrgsPages) }}
        onShowDetails={handleShowDetails}
        onSwitchOrganization={handleSwitchOrganization}
      />
    {/if}

    <OrganizationAvailableSection
      {searchTerm}
      page={allOrgsPage}
      totalPages={totalAllOrgsPages}
      filteredCount={filteredOrganizations.length}
      organizations={paginatedAllOrgs}
      onSearchInput={(value: string) => {
        searchTerm = value
        handleAllOrgsSearchInput()
      }}
      onPrev={() => { allOrgsPage = Math.max(allOrgsPage - 1, 1) }}
      onNext={() => { allOrgsPage = Math.min(allOrgsPage + 1, totalAllOrgsPages) }}
      onShowDetails={handleShowDetails}
      {checkMembershipStatus}
      {renderJoinButton}
    />
  </div>

  <OrganizationDetailDialog
    open={showDetailDialog}
    {selectedOrg}
    {localCurrentOrgId}
    {checkMembershipStatus}
    onSwitchOrganization={handleSwitchOrganization}
    onJoinOrganization={handleJoinOrganization}
    onOpenChange={(open: boolean) => {
      showDetailDialog = open
    }}
    onClose={() => { showDetailDialog = false }}
  />
</AppLayout>
