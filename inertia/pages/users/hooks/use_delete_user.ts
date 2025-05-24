import React from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { User } from '../types'

export const useDeleteUser = (authUserId: number) => {
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Mở dialog xác nhận xóa người dùng
  const openDeleteConfirmModal = (user: User) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  // Xử lý xóa người dùng khỏi tổ chức
  const handleDeleteUser = () => {
    if (!userToDelete) return
    setIsDeleting(true)
    // Sử dụng Inertia router để gửi request DELETE
    router.delete(`/organizations/users/${userToDelete.id}/remove`, {
      onBefore: () => {
        // Ngăn xóa tài khoản đang đăng nhập
        if (userToDelete.id === authUserId) {
          toast.error('Không thể xóa tài khoản của chính bạn')
          setDeleteModalOpen(false)
          setIsDeleting(false)
          return false
        }
        return true
      },
      onSuccess: () => {
        toast.success('Đã xóa người dùng khỏi tổ chức thành công')
        setDeleteModalOpen(false)
        setIsDeleting(false)
        // Tải lại trang để cập nhật danh sách
        window.location.reload()
      },
      onError: (errors: unknown) => {
        console.error('Lỗi khi xóa người dùng:', errors)
        toast.error(errors.message || 'Không thể xóa người dùng khỏi tổ chức')
        setDeleteModalOpen(false)
        setIsDeleting(false)
      },
    })
  }

  return {
    deleteModalOpen,
    setDeleteModalOpen,
    userToDelete,
    isDeleting,
    openDeleteConfirmModal,
    handleDeleteUser,
  }
}
