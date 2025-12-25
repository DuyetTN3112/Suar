import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { confirmDialogStore } from '@/apps/user/shared/stores/confirm_dialog_store.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'

import type { PendingApprovalProps, UserDirectoryRecord } from '../types'

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

  function getUserDisplayName(user: UserDirectoryRecord): string {
    return user.username || user.email || 'Unknown'
  }

  function approveUser(user: UserDirectoryRecord) {
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
          const newData = users.filter((u) => u.id !== user.id)
          users.splice(0, users.length, ...newData)
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

  async function approveAllUsers() {
    const users = getUsers()
    if (!users.length) {
      notificationStore.info('Không có người dùng nào cần phê duyệt')
      return
    }

    const confirmed = await confirmDialogStore.request({
      title: 'Phê duyệt tất cả người dùng',
      desc: `Bạn có chắc chắn muốn phê duyệt tất cả ${users.length} người dùng không?`,
      confirmText: 'Phê duyệt tất cả',
      cancelBtnText: 'Hủy',
    })
    if (!confirmed) return

    users.forEach((user) => {
      approveUser(user)
    })
  }

  return {
    isSubmitting,
    getUserDisplayName,
    approveUser,
    approveAllUsers,
  }
}
