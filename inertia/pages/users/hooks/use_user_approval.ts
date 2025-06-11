import React from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import type { User } from '../types'

export const useUserApproval = () => {
  const [approvalModalOpen, setApprovalModalOpen] = React.useState(false)
  const [pendingUsers, setPendingUsers] = React.useState<User[]>([])
  const [pendingCount, setPendingCount] = React.useState(0)
  const [isLoadingPendingUsers, setIsLoadingPendingUsers] = React.useState(false)
  const [isApprovingUser, setIsApprovingUser] = React.useState<Record<number, boolean>>({})

  // Tải số lượng người dùng chờ duyệt
  const loadPendingCount = async () => {
    try {
      const response = await fetch('/api/users/pending-approval/count', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setPendingCount(data.count || 0)
    } catch (error) {
      console.error('Lỗi khi lấy số lượng người dùng chờ duyệt:', error)
    }
  }
  // Lấy danh sách người dùng chờ duyệt
  const loadPendingUsers = async () => {
    setIsLoadingPendingUsers(true)
    try {
      // Sử dụng API để lấy danh sách người dùng chờ duyệt
      const response = await fetch(`/api/users/pending-approval`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()

      if (!result.users || !Array.isArray(result.users)) {
        console.warn('Invalid users data format:', result)
        setPendingUsers([])
      } else {
        setPendingUsers(result.users || [])
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng chờ duyệt:', error)
      toast.error('Không thể tải danh sách người dùng chờ duyệt')
      setPendingUsers([])
    } finally {
      setIsLoadingPendingUsers(false)
    }
  }
  // Mở modal phê duyệt và lấy danh sách người dùng chờ duyệt
  const openApprovalModal = () => {
    setApprovalModalOpen(true)
    void loadPendingUsers()
  }
  // Phê duyệt người dùng
  const approveUser = (user: User) => {
    if (!user || !user.id) {
      toast.error('Không tìm thấy thông tin người dùng')
      return
    }

    setIsApprovingUser((prev) => ({ ...prev, [user.id]: true }))

    // Sử dụng Inertia router thay vì fetch API để xử lý CSRF token tự động
    router.put(
      `/users/${user.id}/approve`,
      {},
      {
        onSuccess: () => {
          toast.success('Đã phê duyệt người dùng thành công')
          // Cập nhật danh sách người dùng chờ duyệt
          setPendingUsers((prev) => prev.filter((u) => u.id !== user.id))
          // Cập nhật trạng thái submit
          setIsApprovingUser((prev) => ({ ...prev, [user.id]: false }))
          // Cập nhật số lượng người dùng chờ duyệt
          setPendingCount((prev) => Math.max(0, prev - 1))
        },
        onError: (errors) => {
          console.error('Lỗi khi phê duyệt người dùng:', errors)
          toast.error('Không thể phê duyệt người dùng. Vui lòng thử lại.')
          setIsApprovingUser((prev) => ({ ...prev, [user.id]: false }))
        },
        onFinish: () => {
          setIsApprovingUser((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }
  // Phê duyệt tất cả người dùng
  const approveAllUsers = () => {
    if (pendingUsers.length === 0) {
      toast.info('Không có người dùng nào cần phê duyệt')
      return
    }
    if (
      confirm(`Bạn có chắc chắn muốn phê duyệt tất cả ${pendingUsers.length} người dùng không?`)
    ) {
      // Đánh dấu tất cả người dùng đang được phê duyệt
      const approvingObj: Record<number, boolean> = {}
      pendingUsers.forEach((user) => {
        if (user.id) {
          approvingObj[user.id] = true
        }
      })
      setIsApprovingUser(approvingObj)
      // Phê duyệt từng người dùng một - sử dụng cách tuần tự để tránh quá nhiều request cùng lúc
      const approveUsersSequentially = async () => {
        try {
          // Tạo bản sao của danh sách để không ảnh hưởng đến state gốc trong quá trình xử lý
          const usersToProccess = [...pendingUsers]
          let successCount = 0

          for (const user of usersToProccess) {
            if (!user.id) continue

            try {
              // Sử dụng Promise để có thể xử lý tuần tự
              await new Promise((resolve, reject) => {
                router.put(
                  `/users/${user.id}/approve`,
                  {},
                  {
                    onSuccess: () => {
                      successCount++
                      resolve(true)
                    },
                    onError: (error) => {
                      console.error(`Lỗi khi phê duyệt người dùng ${user.email}:`, error)
                      reject(error)
                    },
                  }
                )
              })
            } catch (error) {
              console.warn(
                `Bỏ qua lỗi cho người dùng ${user.email} và tiếp tục với người dùng tiếp theo`
              )
              // Tiếp tục với người dùng tiếp theo ngay cả khi có lỗi
            }
          }
          if (successCount > 0) {
            toast.success(`Đã phê duyệt thành công ${successCount} người dùng`)
            // Cập nhật danh sách
            setPendingUsers([])
            // Cập nhật số lượng người dùng chờ duyệt
            setPendingCount(0)
          } else {
            toast.error('Không thể phê duyệt bất kỳ người dùng nào')
            void loadPendingUsers() // Tải lại danh sách
          }
        } catch (error) {
          console.error('Lỗi trong quá trình phê duyệt tất cả người dùng:', error)
          toast.error('Có lỗi xảy ra khi phê duyệt người dùng. Vui lòng thử lại.')
          void loadPendingUsers() // Tải lại danh sách
        } finally {
          setIsApprovingUser({}) // Xóa trạng thái đang phê duyệt
        }
      }
      // Bắt đầu quá trình phê duyệt tuần tự
      void approveUsersSequentially()
    }
  }
  return {
    approvalModalOpen,
    setApprovalModalOpen,
    pendingUsers,
    pendingCount,
    setPendingCount,
    isLoadingPendingUsers,
    isApprovingUser,
    loadPendingCount,
    loadPendingUsers,
    openApprovalModal,
    approveUser,
    approveAllUsers,
  }
}
