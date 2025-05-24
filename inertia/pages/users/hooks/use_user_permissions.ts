import React from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { User } from '../types'
import useTranslation from '@/hooks/use_translation'

export const useUserPermissions = () => {
  const { t } = useTranslation()
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Hàm mở dialog chỉnh sửa quyền
  const openEditPermissionsModal = (user: User) => {
    if (!user || !user.id) {
      toast.error(t('user.error.user_not_found', {}, 'Không tìm thấy thông tin người dùng'))
      return
    }
    setSelectedUserId(user.id)
    setSelectedUser(user)
    // Ưu tiên sử dụng organization_role nếu có
    setSelectedRoleId(user.organization_role?.id ? String(user.organization_role.id) : '')
    setEditModalOpen(true)
  }

  // Hàm xử lý cập nhật quyền
  const handleUpdatePermissions = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId || !selectedRoleId) {
      toast.error(t('user.error.select_role', {}, 'Vui lòng chọn vai trò'))
      return
    }
    setIsSubmitting(true)
    // Đảm bảo roleId là số nguyên
    const roleIdNumber = Number.parseInt(selectedRoleId, 10)
    // Sử dụng router.put để gửi PUT request
    router.put(
      `/organizations/users/${selectedUserId}/update-permissions`,
      {
        role_id: roleIdNumber,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        preserveScroll: false,
        preserveState: false,
        onSuccess: () => {
          setEditModalOpen(false)
          setIsSubmitting(false)
          toast.success(
            t(
              'user.success.role_updated',
              {},
              'Đã cập nhật vai trò người dùng trong tổ chức thành công'
            )
          )

          // Đảm bảo tải lại toàn bộ trang ngay lập tức
          window.location.reload()
        },

        onError: (errors) => {
          setIsSubmitting(false)
          console.error('Lỗi cập nhật quyền:', errors)
          const errorMessage =
            errors.message ||
            t('user.error.update_failed', {}, 'Không thể cập nhật quyền. Vui lòng thử lại.')
          toast.error(errorMessage)
        },
        onFinish: () => {
          setIsSubmitting(false)
        },
      }
    )
  }

  // Reset modal state khi đóng dialog
  const handleCloseModal = () => {
    setEditModalOpen(false)
    // Đảm bảo state được reset khi modal đóng
    setTimeout(() => {
      setSelectedUserId(null)
      setSelectedUser(null)
      setSelectedRoleId('')
    }, 100)
  }

  return {
    editModalOpen,
    setEditModalOpen,
    selectedUserId,
    selectedUser,
    selectedRoleId,
    setSelectedRoleId,
    isSubmitting,
    openEditPermissionsModal,
    handleUpdatePermissions,
    handleCloseModal,
  }
}
