import React from 'react'
import { Head, Link, router, usePage } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import useTranslation from '@/hooks/use_translation'
import { ArrowPathIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { UsersProps } from './types'
import { isSuperAdminInCurrentOrg } from './utils/user_utils'
import { useUserPermissions } from './hooks/use_user_permissions'
import { useUserApproval } from './hooks/use_user_approval'
import { useAddUsers } from './hooks/use_add_users'
import { useDeleteUser } from './hooks/use_delete_user'
import UsersList from './components/UsersList'
import EditRoleModal from './components/EditRoleModal'
import DeleteUserModal from './components/DeleteUserModal'
import ApprovalModal from './components/ApprovalModal'
import AddUserModal from './components/AddUserModal'

type User = {
  id: number
  first_name: string | null
  last_name: string | null
  full_name: string | null
  email: string
  username?: string
  role: {
    id: number
    name: string
  }
  organization_role?: {
    id: number
    name: string
  }
  status: {
    id: number
    name: string
  }
  organization_users?: {
    organization_id: number
    role_id: number
    role?: {
      id: number
      name: string
    }
  }[]
  created_at?: string
}

export default function Users({ users, filters, metadata }: UsersProps) {
  const [search, setSearch] = React.useState(filters.search || '')
  const { auth } = usePage().props as any
  const { t, locale } = useTranslation()



  // Xác định user có phải là superadmin trong tổ chức không
  const currentUserIsSuperAdmin = isSuperAdminInCurrentOrg(auth.user)

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
  } = useUserPermissions()

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
  } = useUserApproval()

  const {
    deleteModalOpen,
    setDeleteModalOpen,
    userToDelete,
    isDeleting,
    openDeleteConfirmModal,
    handleDeleteUser
  } = useDeleteUser(auth.user.id)

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
  } = useAddUsers()

  // Tải số lượng người dùng chờ duyệt khi component được mounted
  React.useEffect(() => {
    if (currentUserIsSuperAdmin) {
      loadPendingCount()
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/users?search=${search}`
  }

  return (
    <>
      <Head title={t('user.users', {}, "Người dùng")} />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {t('user.users', {}, "Người dùng")}
            <span className="ml-2 text-sm text-gray-500">({locale})</span>
          </h1>
          <div className="flex gap-2">
            {currentUserIsSuperAdmin && (
              <Button variant="secondary" onClick={openApprovalModal}>
                {t('user.approve_users', {}, "Phê duyệt người dùng")} {pendingCount > 0 && <span className="ml-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">{pendingCount}</span>}
              </Button>
            )}
            {currentUserIsSuperAdmin && (
              <Button onClick={openAddUserModal}>
                {t('user.add_user', {}, "Thêm người dùng")}
              </Button>
            )}
          </div>
        </div>

        {/* Hiển thị debug info trong môi trường development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 p-2 bg-gray-100 text-xs rounded">
            <p>Debug: Current locale: {locale}</p>
            <p>Has translations: {Object.keys(usePage().props.translations || {}).length > 0 ? 'Yes' : 'No'}</p>
          </div>
        )}

        <div className="mt-6">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <Input
              placeholder={t('user.search_users', {}, "Tìm kiếm người dùng...")}
              className="max-w-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" type="submit">{t('common.search', {}, "Tìm kiếm")}</Button>
          </form>
        </div>

        <div className="mt-6">
          <UsersList
            users={users}
            filters={filters}
            currentUserId={auth.user.id}
            isSuperAdmin={currentUserIsSuperAdmin}
            onEditPermissions={openEditPermissionsModal}
            onDeleteUser={openDeleteConfirmModal}
          />
        </div>

        {/* Modals */}
        <EditRoleModal
          open={editModalOpen}
          onClose={handleCloseModal}
          selectedUser={selectedUser}
          selectedRoleId={selectedRoleId}
          setSelectedRoleId={setSelectedRoleId}
          isSubmitting={isSubmitting}
          onSubmit={handleUpdatePermissions}
        />

        <DeleteUserModal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          user={userToDelete}
          isDeleting={isDeleting}
          onConfirm={handleDeleteUser}
        />

        <ApprovalModal
          open={approvalModalOpen}
          onClose={() => setApprovalModalOpen(false)}
          pendingUsers={pendingUsers}
          isLoadingPendingUsers={isLoadingPendingUsers}
          isApprovingUser={isApprovingUser}
          onApproveUser={approveUser}
          onApproveAll={approveAllUsers}
        />

        <AddUserModal
          open={addUserModalOpen}
          onClose={() => setAddUserModalOpen(false)}
          allSystemUsers={allSystemUsers}
          selectedUserIds={selectedUserIds}
          searchUserTerm={searchUserTerm}
          setSearchUserTerm={setSearchUserTerm}
          isLoadingSystemUsers={isLoadingSystemUsers}
          isAddingUsers={isAddingUsers}
          currentPage={currentPage}
          totalPages={totalPages}
          onSearch={handleSearchUsers}
          onToggleUserSelection={toggleUserSelection}
          onAddUsers={handleAddUsersToOrganization}
          onChangePage={(page) => loadAllSystemUsers(page, searchUserTerm)}
        />
      </div>
    </>
  )
}

Users.layout = (page: React.ReactNode) => <AppLayout title="Người dùng">{page}</AppLayout>
