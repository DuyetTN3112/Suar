import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { notificationStore } from '@/stores/notification_store.svelte'

import type { PendingApprovalProps, User } from '../types'

type PendingUsersState = PendingApprovalProps['users']

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

export function createPendingApproval(getUsers: () => PendingUsersState) {
  const isSubmitting = writable<Record<string, boolean>>({})

  function getUserDisplayName(user: User): string {
    return user.username || user.email || 'Unknown'
  }

  function approveUser(user: User) {
    if (!user.id) {
      notificationStore.error('Không tìm thấy thông tin người dùng')
      return
    }

    const users = getUsers()
    isSubmitting.update((prev) => ({ ...prev, [user.id]: true }))

    router.put(
      `/users/${user.id}/approve`,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success('Đã phê duyệt người dùng thành công')
          const newData = users.data.filter((u) => u.id !== user.id)
          users.data = newData
          users.meta.total = newData.length
          isSubmitting.update((prev) => ({ ...prev, [user.id]: false }))
        },
        onError: (errors: unknown) => {
          console.error('Lỗi khi phê duyệt người dùng:', errors)
          notificationStore.error(
            getErrorMessage(errors, 'Không thể phê duyệt người dùng. Vui lòng thử lại.')
          )
          isSubmitting.update((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }

  function approveAllUsers() {
    const users = getUsers()
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
