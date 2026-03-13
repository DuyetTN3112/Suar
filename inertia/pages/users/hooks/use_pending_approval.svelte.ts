import { writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { notificationStore } from '@/stores/notification_store.svelte'
import type { User } from '../types'

export function createPendingApproval(users: { data: User[]; meta: any }) {
  const isSubmitting = writable<Record<number, boolean>>({})

  function getUserDisplayName(user: User): string {
    return user.username || user.email || 'Unknown'
  }

  function approveUser(user: User) {
    if (!user || !user.id) {
      notificationStore.error('Không tìm thấy thông tin người dùng')
      return
    }

    isSubmitting.update((prev) => ({ ...prev, [user.id]: true }))

    router.put(
      `/users/${user.id}/approve`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        onSuccess: () => {
          notificationStore.success('Đã phê duyệt người dùng thành công')
          const newData = users.data.filter((u) => u.id !== user.id)
          users.data = newData
          users.meta.total = newData.length
          isSubmitting.update((prev) => ({ ...prev, [user.id]: false }))
        },
        onError: (errors: any) => {
          console.error('Lỗi khi phê duyệt người dùng:', errors)
          notificationStore.error(
            errors.message || 'Không thể phê duyệt người dùng. Vui lòng thử lại.'
          )
          isSubmitting.update((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }

  function approveAllUsers() {
    if (!users.data.length) {
      notificationStore.info('Không có người dùng nào cần phê duyệt')
      return
    }

    if (confirm(`Bạn có chắc chắn muốn phê duyệt tất cả ${users.data.length} người dùng không?`)) {
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
