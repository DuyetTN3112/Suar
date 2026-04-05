<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import { router } from '@inertiajs/svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { UsersProps } from './types'
  import { isSuperAdminInCurrentOrg } from './utils/user_utils'
  import { createUserPermissions } from './hooks/use_user_permissions.svelte'
  import { createUserApproval } from './hooks/use_user_approval.svelte'
  import { createAddUsers } from './hooks/use_add_users.svelte'
  import { createDeleteUser } from './hooks/use_delete_user.svelte'
  import UsersList from './components/UsersList.svelte'
  import EditRoleModal from './components/EditRoleModal.svelte'
  import DeleteUserModal from './components/DeleteUserModal.svelte'
  import ApprovalModal from './components/ApprovalModal.svelte'
  import AddUserModal from './components/AddUserModal.svelte'

  interface Props {
    users: UsersProps['users']
    filters: UsersProps['filters']
  }

  interface AuthUser {
    id: string
    current_organization_id?: string | null
    org_role?: string | null
    system_role?: string | null
    organization_users?: {
      organization_id: string
      org_role: string
    }[]
  }

  interface PageProps {
    auth?: {
      user?: AuthUser
    }
  }

  const { users, filters }: Props = $props()
  const pageProps = $page.props as PageProps
  const authUser: AuthUser = pageProps.auth?.user ?? {
    id: '',
    current_organization_id: null,
    org_role: null,
    system_role: null,
    organization_users: [],
  }
  const { t } = useTranslation()
  const locale = $derived(
    ($page.props as { locale?: string }).locale ?? 'vi'
  )

  let search = $state('')

  $effect(() => {
    search = filters.search || ''
  })

  // Xác định user có phải là superadmin trong tổ chức không
  const currentUserIsSuperAdmin = $derived(isSuperAdminInCurrentOrg(authUser))

  // Sử dụng các custom hooks
  const {
    editModalOpen,
    selectedUser,
    selectedRoleId,
    setSelectedRoleId,
    isSubmitting,
    openEditPermissionsModal,
    handleUpdatePermissions,
    handleCloseModal
  } = createUserPermissions()

  const {
    approvalModalOpen,
    setApprovalModalOpen,
    pendingUsers,
    pendingCount,
    isLoadingPendingUsers,
    isApprovingUser,
    loadPendingCount,
    openApprovalModal,
    approveUser,
    approveAllUsers
  } = createUserApproval()

  const {
    deleteModalOpen,
    setDeleteModalOpen,
    userToDelete,
    isDeleting,
    openDeleteConfirmModal,
    handleDeleteUser
  } = createDeleteUser(authUser.id)

  const {
    addUserModalOpen,
    setAddUserModalOpen,
    allSystemUsers,
    selectedUserIds,
    searchUserTerm,
    setSearchUserTerm,
    isLoadingSystemUsers,
    isAddingUsers,
    currentPage,
    totalPages,
    loadAllSystemUsers,
    openAddUserModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddUsersToOrganization
  } = createAddUsers()

  // Tải số lượng người dùng chờ duyệt khi component được mounted
  $effect(() => {
    if (currentUserIsSuperAdmin) {
      void loadPendingCount()
    }
  })

  function handleSearch(e: Event) {
    e.preventDefault()
    router.get('/users', { search })
  }
</script>

<AppLayout title="Người dùng">
  <div class="container px-4 py-8 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          Thành viên trong tổ chức
          <span class="ml-2 text-sm text-gray-500">({locale})</span>
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Màn này quản lý thành viên ở ngữ cảnh tổ chức hiện tại. Quản trị tài khoản cấp hệ thống đã tách sang <code>/admin/users</code>.
        </p>
      </div>
      <div class="flex gap-2">
        {#if currentUserIsSuperAdmin}
          <Button variant="secondary" onclick={openApprovalModal}>
            {t('user.approve_users', {}, "Phê duyệt người dùng")}
            {#if $pendingCount > 0}
              <span class="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {$pendingCount}
              </span>
            {/if}
          </Button>
          <Button onclick={() => { openAddUserModal() }}>
            {t('user.add_user', {}, "Thêm người dùng")}
          </Button>
        {/if}
      </div>
    </div>

    <div class="mt-6">
      <form onsubmit={handleSearch} class="flex items-center gap-4">
        <Input
          placeholder={t('user.search_users', {}, "Tìm kiếm thành viên theo tên hoặc email...")}
          class="max-w-sm"
          bind:value={search}
        />
        <Button variant="outline" type="submit">{t('common.search', {}, "Tìm kiếm")}</Button>
      </form>
    </div>

    <div class="mt-6">
      <UsersList
        {users}
        {filters}
        currentUserId={authUser.id}
        isSuperAdmin={currentUserIsSuperAdmin}
        onEditPermissions={openEditPermissionsModal}
        onDeleteUser={openDeleteConfirmModal}
      />
    </div>

    <!-- Modals -->
    <EditRoleModal
      open={$editModalOpen}
      onClose={handleCloseModal}
      selectedUser={$selectedUser}
      selectedRoleId={$selectedRoleId}
      {setSelectedRoleId}
      isSubmitting={$isSubmitting}
      onSubmit={(e: Event) => { handleUpdatePermissions(e, $selectedUser?.id ?? null, $selectedRoleId) }}
    />

    <DeleteUserModal
      open={$deleteModalOpen}
      onClose={() => { setDeleteModalOpen(false) }}
      user={$userToDelete}
      isDeleting={$isDeleting}
      onConfirm={() => { handleDeleteUser($userToDelete); }}
    />

    <ApprovalModal
      open={$approvalModalOpen}
      onClose={() => { setApprovalModalOpen(false) }}
      pendingUsers={$pendingUsers}
      isLoadingPendingUsers={$isLoadingPendingUsers}
      isApprovingUser={$isApprovingUser}
      onApproveUser={approveUser}
      onApproveAll={approveAllUsers}
    />

    <AddUserModal
      open={$addUserModalOpen}
      onClose={() => { setAddUserModalOpen(false) }}
      allSystemUsers={$allSystemUsers}
      selectedUserIds={$selectedUserIds}
      searchUserTerm={$searchUserTerm}
      {setSearchUserTerm}
      isLoadingSystemUsers={$isLoadingSystemUsers}
      isAddingUsers={$isAddingUsers}
      currentPage={$currentPage}
      totalPages={$totalPages}
      onSearch={handleSearchUsers}
      onToggleUserSelection={toggleUserSelection}
      onAddUsers={handleAddUsersToOrganization}
      onChangePage={(p: number) => loadAllSystemUsers(p, $searchUserTerm)}
    />
  </div>
</AppLayout>
