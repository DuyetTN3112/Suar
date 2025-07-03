import { get, writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { notificationStore } from '@/stores/notification_store.svelte'
import type { User } from '../types'

interface PendingCountResponse {
  count?: number
}

interface PendingUsersResponse {
  users?: User[]
}

interface RouterErrorBag {
  message?: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

export function createUserApproval() {
  const approvalModalOpen = writable(false)
  const pendingUsers = writable<User[]>([])
  const pendingCount = writable(0)
  const isLoadingPendingUsers = writable(false)
  const isApprovingUser = writable<Record<string, boolean>>({})

  // Tải số lượng người dùng chờ duyệt
  async function loadPendingCount() {
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
      const data = (await response.json()) as PendingCountResponse
      pendingCount.set(data.count ?? 0)
    } catch (error) {
      console.error('Lỗi khi lấy số lượng người dùng chờ duyệt:', error)
    }
  }

  // Lấy danh sách người dùng chờ duyệt
  async function loadPendingUsers() {
    isLoadingPendingUsers.set(true)
    try {
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
      const result = (await response.json()) as PendingUsersResponse

      if (!result.users || !Array.isArray(result.users)) {
        console.warn('Invalid users data format:', result)
        pendingUsers.set([])
      } else {
        pendingUsers.set(result.users)
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng chờ duyệt:', error)
      notificationStore.error('Không thể tải danh sách người dùng chờ duyệt')
      pendingUsers.set([])
    } finally {
      isLoadingPendingUsers.set(false)
    }
  }

  // Mở modal phê duyệt và lấy danh sách người dùng chờ duyệt
  function openApprovalModal() {
    approvalModalOpen.set(true)
    void loadPendingUsers()
  }

  // Phê duyệt người dùng
  function approveUser(user: User) {
    if (!user.id) {
      notificationStore.error('Không tìm thấy thông tin người dùng')
      return
    }

    isApprovingUser.update((prev) => ({ ...prev, [user.id]: true }))

    router.put(
      `/users/${user.id}/approve`,
      {},
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success('Đã phê duyệt người dùng thành công')
          pendingUsers.update((prev) => prev.filter((u) => u.id !== user.id))
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
          pendingCount.update((prev) => Math.max(0, prev - 1))
        },
        onError: (errors: RouterErrorBag) => {
          console.error('Lỗi khi phê duyệt người dùng:', errors)
          notificationStore.error('Không thể phê duyệt người dùng. Vui lòng thử lại.')
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
        },
        onFinish: () => {
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }

  // Phê duyệt tất cả người dùng
  function approveAllUsers() {
    const currentPendingUsers = get(pendingUsers)

    if (currentPendingUsers.length === 0) {
      notificationStore.info('Không có người dùng nào cần phê duyệt')
      return
    }

    if (
      confirm(
        `Bạn có chắc chắn muốn phê duyệt tất cả ${currentPendingUsers.length} người dùng không?`
      )
    ) {
      const approvingObj: Record<string, boolean> = {}
      currentPendingUsers.forEach((user) => {
        if (user.id) {
          approvingObj[user.id] = true
        }
      })
      isApprovingUser.set(approvingObj)

      const approveUsersSequentially = async () => {
        try {
          const usersToProccess = [...currentPendingUsers]
          let successCount = 0

          for (const user of usersToProccess) {
            if (!user.id) continue

            try {
              await new Promise((resolve, reject) => {
                router.put(
                  `/users/${user.id}/approve`,
                  {},
                  {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                      successCount++
                      resolve(true)
                    },
                    onError: (error: unknown) => {
                      console.error(`Lỗi khi phê duyệt người dùng ${user.email}:`, error)
                      reject(
                        new Error(
                          getErrorMessage(error, `Không thể phê duyệt người dùng ${user.email}`)
                        )
                      )
                    },
                  }
                )
              })
            } catch (_error) {
              console.warn(
                `Bỏ qua lỗi cho người dùng ${user.email} và tiếp tục với người dùng tiếp theo`
              )
            }
          }

          if (successCount > 0) {
            notificationStore.success(`Đã phê duyệt thành công ${successCount} người dùng`)
            pendingUsers.set([])
            pendingCount.set(0)
          } else {
            notificationStore.error('Không thể phê duyệt bất kỳ người dùng nào')
            void loadPendingUsers()
          }
        } catch (error) {
          console.error('Lỗi trong quá trình phê duyệt tất cả người dùng:', error)
          notificationStore.error('Có lỗi xảy ra khi phê duyệt người dùng. Vui lòng thử lại.')
          void loadPendingUsers()
        } finally {
          isApprovingUser.set({})
        }
      }

      void approveUsersSequentially()
    }
  }

  return {
    approvalModalOpen,
    setApprovalModalOpen: (value: boolean) => {
      approvalModalOpen.set(value)
    },
    pendingUsers,
    pendingCount,
    setPendingCount: (value: number) => {
      pendingCount.set(value)
    },
    isLoadingPendingUsers,
    isApprovingUser,
    loadPendingCount,
    loadPendingUsers,
    openApprovalModal,
    approveUser,
    approveAllUsers,
  }
}
