import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'

import type { UserDirectoryRecord } from '../types'

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

export function createDeleteUser(authUserId: string) {
  const deleteModalOpen = writable(false)
  const userToDelete = writable<UserDirectoryRecord | null>(null)
  const isDeleting = writable(false)

  function openDeleteConfirmModal(user: UserDirectoryRecord) {
    userToDelete.set(user)
    deleteModalOpen.set(true)
  }

  function handleDeleteUser(user: UserDirectoryRecord | null) {
    if (!user) return
    isDeleting.set(true)

    router.delete(`/organizations/users/${user.id}/remove`, {
      preserveState: true,
      preserveScroll: true,
      onBefore: () => {
        if (user.id === authUserId) {
          notificationStore.error('Không thể xóa tài khoản của chính bạn')
          deleteModalOpen.set(false)
          isDeleting.set(false)
          return false
        }
        return true
      },
      onSuccess: () => {
        notificationStore.success('Đã xóa người dùng khỏi tổ chức thành công')
        deleteModalOpen.set(false)
        isDeleting.set(false)
        router.reload({ only: ['users', 'flash'] })
      },
      onError: (errors: unknown) => {
        console.error('Lỗi khi xóa người dùng:', errors)
        notificationStore.error(getErrorMessage(errors, 'Không thể xóa người dùng khỏi tổ chức'))
        deleteModalOpen.set(false)
        isDeleting.set(false)
      },
    })
  }

  return {
    deleteModalOpen,
    setDeleteModalOpen: (value: boolean) => {
      deleteModalOpen.set(value)
    },
    userToDelete,
    isDeleting,
    openDeleteConfirmModal,
    handleDeleteUser,
  }
}
