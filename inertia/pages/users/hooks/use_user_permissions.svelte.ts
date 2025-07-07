import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { notificationStore } from '@/stores/notification_store.svelte'

import type { User } from '../types'

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

export function createUserPermissions() {
  const editModalOpen = writable(false)
  const selectedUserId = writable<string | null>(null)
  const selectedUser = writable<User | null>(null)
  const selectedOrgRole = writable<string>('')
  const isSubmitting = writable(false)

  function openEditPermissionsModal(user: User) {
    if (!user.id) {
      notificationStore.error('Không tìm thấy thông tin người dùng')
      return
    }
    selectedUserId.set(user.id)
    selectedUser.set(user)
    const orgRole = user.organization_users?.[0]?.org_role ?? ''
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
        preserveScroll: true,
        preserveState: true,
        onSuccess: () => {
          notificationStore.success('Đã cập nhật quyền người dùng thành công')
          editModalOpen.set(false)
          isSubmitting.set(false)
          router.reload({ only: ['users', 'flash'] })
        },
        onError: (errors: unknown) => {
          console.error('Lỗi khi cập nhật quyền:', errors)
          isSubmitting.set(false)
          notificationStore.error(getErrorMessage(errors, 'Không thể cập nhật quyền người dùng'))
        },
      }
    )
  }

  return {
    editModalOpen,
    selectedUserId,
    selectedUser,
    selectedOrgRole,
    selectedRoleId: selectedOrgRole,
    setSelectedRoleId: (value: string) => {
      selectedOrgRole.set(value)
    },
    isSubmitting,
    openEditPermissionsModal,
    handleUpdatePermissions,
    handleCloseModal: () => {
      editModalOpen.set(false)
      selectedUserId.set(null)
      selectedUser.set(null)
      selectedOrgRole.set('')
    },
  }
}
