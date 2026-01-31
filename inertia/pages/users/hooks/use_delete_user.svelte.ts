import { writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { toast } from 'svelte-sonner'
import type { User } from '../types'

export function createDeleteUser(authUserId: number) {
  const deleteModalOpen = writable(false)
  const userToDelete = writable<User | null>(null)
  const isDeleting = writable(false)

  function openDeleteConfirmModal(user: User) {
    userToDelete.set(user)
    deleteModalOpen.set(true)
  }

  function handleDeleteUser(user: User | null) {
    if (!user) return
    isDeleting.set(true)

    router.delete(`/organizations/users/${user.id}/remove`, {
      onBefore: () => {
        if (user.id === authUserId) {
          toast.error('Không thể xóa tài khoản của chính bạn')
          deleteModalOpen.set(false)
          isDeleting.set(false)
          return false
        }
        return true
      },
      onSuccess: () => {
        toast.success('Đã xóa người dùng khỏi tổ chức thành công')
        deleteModalOpen.set(false)
        isDeleting.set(false)
        router.reload()
      },
      onError: (errors: any) => {
        console.error('Lỗi khi xóa người dùng:', errors)
        toast.error(errors.message || 'Không thể xóa người dùng khỏi tổ chức')
        deleteModalOpen.set(false)
        isDeleting.set(false)
      },
    })
  }

  return {
    deleteModalOpen,
    userToDelete,
    isDeleting,
    openDeleteConfirmModal,
    handleDeleteUser,
  }
}
