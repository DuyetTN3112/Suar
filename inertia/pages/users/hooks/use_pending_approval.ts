import React from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { User } from '../types'

export const usePendingApproval = (users: { data: User[]; meta: unknown }) => {
  const [isSubmitting, setIsSubmitting] = React.useState<Record<number, boolean>>({})

  // Hàm lấy tên hiển thị của người dùng
  const getUserDisplayName = (user: User): string => {
    return user.username || user.email || 'Unknown'
  }
  // Hàm xử lý phê duyệt người dùng
  const approveUser = (user: User) => {
    if (!user || !user.id) {
      toast.error('Không tìm thấy thông tin người dùng')
      return
    }

    setIsSubmitting((prev) => ({ ...prev, [user.id]: true }))

    // Sử dụng router.put để gửi request phê duyệt người dùng
    router.put(
      `/users/${user.id}/approve`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        onSuccess: () => {
          toast.success('Đã phê duyệt người dùng thành công')
          // Xóa người dùng này khỏi danh sách
          const newData = users.data.filter((u) => u.id !== user.id)
          users.data = newData
          users.meta.total = newData.length
          setIsSubmitting((prev) => ({ ...prev, [user.id]: false }))
        },
        onError: (errors) => {
          console.error('Lỗi khi phê duyệt người dùng:', errors)
          toast.error(errors.message || 'Không thể phê duyệt người dùng. Vui lòng thử lại.')
          setIsSubmitting((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }

  // Hàm phê duyệt tất cả người dùng
  const approveAllUsers = () => {
    if (!users.data.length) {
      toast.info('Không có người dùng nào cần phê duyệt')
      return
    }

    // Hiển thị thông báo xác nhận
    if (confirm(`Bạn có chắc chắn muốn phê duyệt tất cả ${users.data.length} người dùng không?`)) {
      // Phê duyệt từng người dùng một
      users.data.forEach((user) => {
        approveUser(user)
      })
    }
  }

  return {
    isSubmitting,
    getUserDisplayName,
    approveUser,
    approveAllUsers,
  }
}
