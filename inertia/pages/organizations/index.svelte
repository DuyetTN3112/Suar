<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Plus, Building2, FolderKanban, SquareCheckBig, Star, ArrowRight } from 'lucide-svelte'

  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
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
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    organizations: Organization[]
    allOrganizations?: Organization[]
    currentOrganizationId: string | null
  }

  const { organizations, allOrganizations = [], currentOrganizationId }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)

  const searchTerm = $state<string>('')
  let allOrgsPage = $state(1)
  let userOrgsPage = $state(1)
  let selectedOrg = $state<Organization | null>(null)
  let showDetailDialog = $state(false)
  let localCurrentOrgId = $state<string | null>(null)
  let activeTab = $state<'joined' | 'available'>('joined')
  const orgMembershipStatus = $state<Partial<Record<string, { status: string | null }>>>({})

  $effect(() => {
    localCurrentOrgId = currentOrganizationId
  })

  $effect(() => {
    if (organizations.length === 0) {
      activeTab = 'available'
    }
  })

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
      const { ok, data } = await switchOrganizationRequest('/organizations/switch', id)
      if (!ok || !data.success) {
        notificationStore.error(data.message ?? 'Có lỗi xảy ra khi chuyển đổi tổ chức')
        return
      }

      localCurrentOrgId = id
      if (showDetailDialog) {
        showDetailDialog = false
      }
      notificationStore.success(data.message ?? 'Đã chuyển đổi tổ chức thành công')
      router.visit(data.redirect ?? '/tasks', {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch {
      notificationStore.error('Có lỗi xảy ra khi chuyển đổi tổ chức')
    }
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

  const hasOrganizations = $derived(organizations.length > 0)
  const totalAllOrgsPages = $derived(Math.max(1, Math.ceil(filteredOrganizations.length / 10)))
  const totalUserOrgsPages = $derived(Math.max(1, Math.ceil(organizations.length / 10)))
  const paginatedAllOrgs = $derived(filteredOrganizations.slice((allOrgsPage - 1) * 10, allOrgsPage * 10))
  const paginatedUserOrgs = $derived(organizations.slice((userOrgsPage - 1) * 10, userOrgsPage * 10))
  const stats = $derived({
    organizations: organizations.length,
    projects: organizations.reduce((sum, org) => sum + (org.project_count ?? 0), 0),
    reviews: filteredOrganizations.length,
  })

  function checkMembershipStatus(orgId: string) {
    if (organizations.some((org) => org.id === orgId)) {
      return { isMember: true, status: 'approved' }
    }

    if (orgMembershipStatus[orgId] !== undefined) {
      return { isMember: false, status: orgMembershipStatus[orgId].status }
    }

    const org = allOrganizations.find((item) => item.id === orgId)
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
          text: 'Hiện tại',
        }
      }

      return {
        variant: 'default' as const,
        disabled: false,
        text: 'Chuyển đổi',
        onClick: () => {
          void handleSwitchOrganization(org.id)
        },
