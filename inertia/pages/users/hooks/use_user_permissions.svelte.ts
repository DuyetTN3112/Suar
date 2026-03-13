import { writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { notificationStore } from '@/stores/notification_store.svelte'
import type { User } from '../types'

export function createUserPermissions() {
  const editModalOpen = writable(false)
  const selectedUserId = writable<string | null>(null)
  const selectedUser = writable<User | null>(null)
  const selectedOrgRole = writable<string>('')
  const isSubmitting = writable(false)

  function openEditPermissionsModal(user: User) {
    if (!user || !user.id) {
      notificationStore.error('Không tìm thấy thông tin người dùng')
      return
    }
    selectedUserId.set(user.id)
    selectedUser.set(user)
    // Use org_role from organization_users if available
    const orgRole = user.organization_users?.[0]?.org_role || ''
    selectedOrgRole.set(orgRole)
    editModalOpen.set(true)
  }

  function handleUpdatePermissions(e: Event, userId: string | null, orgRole: string) {
    e.preventDefault()
    if (!userId || !orgRole) {
      notificationStore.error('Vui lòng chọn vai trò')
      return
    }
    isSubmitting.set(true)

    router.put(
      `/organizations/users/${userId}/update-permissions`,
      {
        org_role: orgRole,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        preserveScroll: false,
        preserveState: false,
        onSuccess: () => {
          notificationStore.success('Đã cập nhật quyền người dùng thành công')
          editModalOpen.set(false)
          isSubmitting.set(false)
          router.reload({ only: ['users'] })
        },
        onError: (errors: any) => {
          console.error('Lỗi khi cập nhật quyền:', errors)
          isSubmitting.set(false)
          notificationStore.error(errors.message || 'Không thể cập nhật quyền người dùng')
        },
      }
    )
  }

  return {
    editModalOpen,
    selectedUserId,
    selectedUser,
    selectedOrgRole,
    isSubmitting,
    openEditPermissionsModal,
    handleUpdatePermissions,
  }
}
