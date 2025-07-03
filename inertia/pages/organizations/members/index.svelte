<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardDescription from '@/components/ui/card_description.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import { notificationStore } from '@/stores/notification_store.svelte'
  import type { MembersFiltersState, OrganizationMembersPageProps } from './members_types'
  import MemberManagementDialogs from './components/member_management_dialogs.svelte'
  import PendingRequestsDialog from './components/pending_requests_dialog.svelte'
  import MembersPageActions from './components/members_page_actions.svelte'
  import MemberFiltersBar from './components/member_filters_bar.svelte'
  import MembersTable from './components/members_table.svelte'

  const props: OrganizationMembersPageProps = $props()
  const organization = $derived(props.organization)
  const members = $derived(props.members ?? [])
  const roles = $derived(props.roles)
  const userRole = $derived(props.userRole)
  const pendingRequests = $derived(props.pendingRequests ?? [])
  const initialFilters = $derived({
    search: props.filters?.search ?? '',
    status: props.filters?.status,
    roleId: props.filters?.roleId,
    include: props.filters?.include ?? [],
  })

  let showAddMemberDialog = $state(false)
  let showInviteDialog = $state(false)
  let showPendingRequestsDialog = $state(false)
  let addMemberForm = $state({
    email: '',
    roleId: 'org_member',
  })
  let addMemberErrors = $state<{ email?: string; roleId?: string }>({})
  let addMemberProcessing = $state(false)
  let inviteUserForm = $state({
    email: '',
    roleId: 'org_member',
  })
  let inviteUserErrors = $state<{ email?: string; roleId?: string }>({})
  let inviteUserProcessing = $state(false)
  const pendingRequestsCount = $derived(pendingRequests.length)

  const isSuperAdmin = $derived(userRole === 'org_owner')

  function applyFilters(next: MembersFiltersState) {
    const params: Record<string, string | number> = { page: 1 }

    if (next.search.trim().length > 0) {
      params.search = next.search.trim()
    }
    if (next.status) {
      params.status = next.status
    }
    if (next.roleId) {
      params.roleId = next.roleId
    }
    if (next.include.length > 0) {
      params.include = next.include.join(',')
    }

    router.get(`/organizations/${organization.id}/members`, params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    })
  }

  function resetFilters() {
    router.get(
      `/organizations/${organization.id}/members`,
      { page: 1 },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      }
    )
  }

  function refreshPage() {
    router.reload({
      only: ['members', 'pendingRequests'],
    })
  }

  function handleProcessRequest(userId: string, action: 'approve' | 'reject') {
    router.post(
      `/organizations/${organization.id}/members/process-request/${userId}`,
      { action },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success(`Đã ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu thành công`)
          refreshPage()
        },
        onError: () => {
          notificationStore.error(`Có lỗi xảy ra khi ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu`)
        },
      }
    )
  }

  function handleUpdateRole(memberId: string, newRole: string) {
    router.post(
      `/organizations/${organization.id}/members/update-role/${memberId}`,
      { org_role: newRole },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success('Đã cập nhật vai trò thành công')
          refreshPage()
        },
        onError: () => {
          notificationStore.error('Có lỗi xảy ra khi cập nhật vai trò')
        },
      }
    )
  }

  function handleRemoveMember(memberId: string) {
    if (confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi tổ chức?')) {
      router.delete(`/organizations/${organization.id}/members/${memberId}`, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success('Đã xóa thành viên thành công')
          refreshPage()
        },
        onError: () => {
          notificationStore.error('Có lỗi xảy ra khi xóa thành viên')
        },
      })
    }
  }

  function handleAddMemberSubmit(event: Event) {
    event.preventDefault()
    addMemberProcessing = true
    addMemberErrors = {}

    router.post(
      `/organizations/${organization.id}/members/add`,
      {
        email: addMemberForm.email,
        roleId: addMemberForm.roleId,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          addMemberForm = {
            email: '',
            roleId: 'org_member',
          }
          showAddMemberDialog = false
          notificationStore.success('Đã thêm thành viên thành công')
          refreshPage()
        },
        onError: (serverErrors: Record<string, string>) => {
          addMemberErrors = {
            email: serverErrors.email,
            roleId: serverErrors.roleId,
          }
          notificationStore.error('Có lỗi xảy ra khi thêm thành viên')
        },
        onFinish: () => {
          addMemberProcessing = false
        },
      }
    )
  }

  function handleInviteUserSubmit(event: Event) {
    event.preventDefault()
    inviteUserProcessing = true
    inviteUserErrors = {}

    router.post(
      `/organizations/${organization.id}/members/invite`,
      {
        email: inviteUserForm.email,
        roleId: inviteUserForm.roleId,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          inviteUserForm = {
            email: '',
            roleId: 'org_member',
          }
          showInviteDialog = false
          notificationStore.success('Đã gửi lời mời thành công')
          refreshPage()
        },
        onError: (serverErrors: Record<string, string>) => {
          inviteUserErrors = {
            email: serverErrors.email,
            roleId: serverErrors.roleId,
          }
          notificationStore.error('Có lỗi xảy ra khi gửi lời mời')
        },
        onFinish: () => {
          inviteUserProcessing = false
        },
      }
    )
  }
</script>

<svelte:head>
  <title>Quản lý thành viên - {organization.name}</title>
</svelte:head>

<AppLayout title={`Quản lý thành viên - ${organization.name}`}>
  <div class="container py-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">Quản lý thành viên tổ chức</h1>
      <MembersPageActions
        {isSuperAdmin}
        {pendingRequestsCount}
        onOpenPendingRequests={() => {
          showPendingRequestsDialog = true
        }}
        onOpenInvite={() => {
          showInviteDialog = true
        }}
        onOpenAddMember={() => {
          showAddMemberDialog = true
        }}
      />
    </div>

    <Card>
      <CardHeader class="pb-2">
        <CardTitle>Danh sách thành viên</CardTitle>
        <CardDescription>
          Tổ chức hiện có {members.length} thành viên
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MemberFiltersBar
          {roles}
          value={initialFilters}
          onApply={applyFilters}
          onReset={resetFilters}
        />

        <div class="mt-4">
          <MembersTable
            {members}
            {roles}
            {userRole}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />
        </div>
      </CardContent>
    </Card>
  </div>

  <MemberManagementDialogs
    organizationName={organization.name}
    {roles}
    {showAddMemberDialog}
    {addMemberForm}
    {addMemberErrors}
    {addMemberProcessing}
    onAddMemberSubmit={handleAddMemberSubmit}
    onAddMemberFormEmailChange={(value: string) => {
      addMemberForm = { ...addMemberForm, email: value }
    }}
    onAddMemberFormRoleChange={(value: string) => {
      addMemberForm = { ...addMemberForm, roleId: value }
    }}
    onShowAddMemberDialogChange={(open: boolean) => {
      showAddMemberDialog = open
    }}
    {showInviteDialog}
    {inviteUserForm}
    inviteUserErrors={inviteUserErrors}
    inviteUserProcessing={inviteUserProcessing}
    onInviteUserSubmit={handleInviteUserSubmit}
    onInviteUserFormEmailChange={(value: string) => {
      inviteUserForm = { ...inviteUserForm, email: value }
    }}
    onInviteUserFormRoleChange={(value: string) => {
      inviteUserForm = { ...inviteUserForm, roleId: value }
    }}
    onShowInviteDialogChange={(open: boolean) => {
      showInviteDialog = open
    }}
  />

  {#if isSuperAdmin}
    <PendingRequestsDialog
      open={showPendingRequestsDialog}
      organizationName={organization.name}
      {pendingRequests}
      onProcessRequest={handleProcessRequest}
      onOpenChange={(open: boolean) => {
        showPendingRequestsDialog = open
      }}
    />
  {/if}
</AppLayout>
