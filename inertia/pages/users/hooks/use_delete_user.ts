import { router } from '@inertiajs/svelte'
import { toast } from 'sonner'
import type { User } from '../types'

export const useDeleteUser = (authUserId: string) => {
  let deleteModalOpen = $state(false)
  let userToDelete = $state<User | null>(null)
  let isDeleting = $state(false)

  // Mở dialog xác nhận xóa người dùng
  const openDeleteConfirmModal = (user: User) => {
    userToDelete = user
    deleteModalOpen = true
  }

  const setDeleteModalOpen = (value: boolean) => {
    deleteModalOpen = value
  }

  // Xử lý xóa người dùng khỏi tổ chức
  const handleDeleteUser = () => {
    if (!userToDelete) return
    isDeleting = true
    // Sử dụng Inertia router để gửi request DELETE
    router.delete(`/organizations/users/${userToDelete.id}/remove`, {
      onBefore: () => {
        // Ngăn xóa tài khoản đang đăng nhập
        if (userToDelete.id === authUserId) {
          toast.error('Không thể xóa tài khoản của chính bạn')
          deleteModalOpen = false
          isDeleting = false
          return false
        }
        return true
      },
      onSuccess: () => {
        toast.success('Đã xóa người dùng khỏi tổ chức thành công')
        deleteModalOpen = false
        isDeleting = false
        // Tải lại trang để cập nhật danh sách
        window.location.reload()
      },
      onError: (errors: unknown) => {
        console.error('Lỗi khi xóa người dùng:', errors)
        toast.error(errors.message || 'Không thể xóa người dùng khỏi tổ chức')
        deleteModalOpen = false
        isDeleting = false
      },
    })
  }

  return {
    get deleteModalOpen() {
      return deleteModalOpen
    },
    setDeleteModalOpen,
    get userToDelete() {
      return userToDelete
    },
    get isDeleting() {
      return isDeleting
    },
    openDeleteConfirmModal,
    handleDeleteUser,
  }
}
