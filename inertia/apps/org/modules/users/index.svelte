<script lang="ts">
  import { page } from '@inertiajs/svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import AddUserModal from './components/add_user_modal.svelte'
  import ApprovalModal from './components/approval_modal.svelte'
  import DeleteUserModal from './components/delete_user_modal.svelte'
  import EditRoleModal from './components/edit_role_modal.svelte'
  import UsersList from './components/users_list.svelte'
  import { createAddUsers } from './hooks/use_add_users.svelte'
  import { createDeleteUser } from './hooks/use_delete_user.svelte'
  import { createUserApproval } from './hooks/use_user_approval.svelte'
  import { createUserPermissions } from './hooks/use_user_permissions.svelte'
  import type { UsersProps } from './types'
  import { isSuperAdminInCurrentOrg } from './utils/user_utils'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    users: UsersProps['users']
    pagination: UsersProps['pagination']
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

  const { users, pagination: pagePagination, filters }: Props = $props()
  
  const pageProps = page.props as PageProps
  const authUser: AuthUser = pageProps.auth?.user ?? {
    id: '',
    current_organization_id: null,
    org_role: null,
    system_role: null,
    organization_users: [],
  }
  const { t } = useTranslation()
  // Current user can manage organization members.
  const currentUserIsSuperAdmin = $derived(isSuperAdminInCurrentOrg(authUser))

  // Organization member workflows.
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
    pagination: modalPagination,
    loadAllSystemUsers,
    openAddUserModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddUsersToOrganization
  } = createAddUsers()

  // Load pending approvals when mounted.
  $effect(() => {
    if (currentUserIsSuperAdmin) {
      void loadPendingCount()
    }
  })

</script>

<OrganizationLayout title={t('user.users', {}, 'Users')}>
  <div class="container px-4 py-8 md:px-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">{t('user.organization_members', {}, 'Organization members')}</h1>
      </div>
      <div class="flex gap-2">
        {#if currentUserIsSuperAdmin}
          <Button variant="secondary" onclick={openApprovalModal}>
            {t('user.approve_users', {}, 'Approve Users')}
            {#if $pendingCount > 0}
              <span class="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-bold leading-none text-primary-foreground">
                {$pendingCount}
              </span>
            {/if}
          </Button>
          <Button onclick={() => { openAddUserModal() }}>
            {t('user.add_user', {}, 'Add User')}
          </Button>
        {/if}
      </div>
    </div>

    <div class="mt-6">
      <UsersList
        {users}
        pagination={pagePagination}
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
      pagination={$modalPagination}
      onSearch={handleSearchUsers}
      onToggleUserSelection={toggleUserSelection}
      onAddUsers={handleAddUsersToOrganization}
      onChangePage={(p: number) => loadAllSystemUsers(p, $searchUserTerm)}
    />
  </div>
</OrganizationLayout>
