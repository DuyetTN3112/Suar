import { router } from '@inertiajs/svelte'
import { get, writable } from 'svelte/store'

import { confirmDialogStore } from '@/apps/org/shared/stores/confirm_dialog_store.svelte'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

import type { UserDirectoryRecord } from '../types'

interface PendingCountResponse {
  data?: {
    count?: number
  }
}

interface PendingUsersResponse {
  data?: UserDirectoryRecord[]
  pagination?: {
    page: number
    perPage: number
    total: number
    hasNextPage: boolean
  }
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
  const { t } = useTranslation()
  const approvalModalOpen = writable(false)
  const pendingUsers = writable<UserDirectoryRecord[]>([])
  const pendingCount = writable(0)
  const isLoadingPendingUsers = writable(false)
  const isApprovingUser = writable<Record<string, boolean>>({})

  // Load count of users pending approval.
  async function loadPendingCount() {
    try {
      const response = await fetch('/api/v1/users/pending-approvals/count', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = (await response.json()) as PendingCountResponse
      pendingCount.set(data.data?.count ?? 0)
    } catch (error) {
      console.error('Failed to load pending approval count:', error)
    }
  }

  // Load users pending approval.
  async function loadPendingUsers() {
    isLoadingPendingUsers.set(true)
    try {
      const response = await fetch(`/api/v1/users/pending-approvals`, {
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

      if (!result.data || !Array.isArray(result.data)) {
        console.warn('Invalid users data format:', result)
        pendingUsers.set([])
      } else {
        pendingUsers.set(result.data)
      }
    } catch (error) {
      console.error('Failed to load pending approval users:', error)
      notificationStore.error(t('user.approval.load_pending_users_error', {}, 'Unable to load pending approval users'))
      pendingUsers.set([])
    } finally {
      isLoadingPendingUsers.set(false)
    }
  }

  // Open approval modal and refresh pending users.
  function openApprovalModal() {
    approvalModalOpen.set(true)
    void loadPendingUsers()
  }

  // Approve a single user.
  function approveUser(user: UserDirectoryRecord) {
    if (!user.id) {
      notificationStore.error(t('user.approval.user_not_found', {}, 'User information not found'))
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
          notificationStore.success(t('user.approval.approve_success', {}, 'User approved successfully'))
          pendingUsers.update((prev) => prev.filter((u) => u.id !== user.id))
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
          pendingCount.update((prev) => Math.max(0, prev - 1))
        },
        onError: (errors: RouterErrorBag) => {
          console.error('Failed to approve user:', errors)
          notificationStore.error(t('user.approval.approve_error', {}, 'Unable to approve user. Please try again.'))
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
        },
        onFinish: () => {
          isApprovingUser.update((prev) => ({ ...prev, [user.id]: false }))
        },
      }
    )
  }

  // Approve all pending users sequentially.
  async function approveAllUsers() {
    const currentPendingUsers = get(pendingUsers)

    if (currentPendingUsers.length === 0) {
      notificationStore.info(t('user.approval.none_pending', {}, 'No users need approval'))
      return
    }

    const confirmed = await confirmDialogStore.request({
      title: t('user.approval.approve_all_title', {}, 'Approve all users'),
      desc: t('user.approval.approve_all_description', { count: currentPendingUsers.length }, 'Are you sure you want to approve all :count users?'),
      confirmText: t('user.approval.approve_all_confirm', {}, 'Approve all'),
      cancelBtnText: t('common.cancel', {}, 'Cancel'),
    })
    if (!confirmed) return

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
                    console.error(`Failed to approve user ${user.email}:`, error)
                    reject(
                      new Error(
                        getErrorMessage(
                          error,
                          t('user.approval.approve_user_error', { email: user.email }, 'Unable to approve user :email')
                        )
                      )
                    )
                  },
                }
              )
            })
          } catch (_error) {
            console.warn(
              t('user.approval.skip_user_error', { email: user.email }, 'Skipping error for user :email and continuing with the next user')
            )
          }
        }

        if (successCount > 0) {
          notificationStore.success(t('user.approval.approve_all_success', { count: successCount }, 'Approved :count users'))
          pendingUsers.set([])
          pendingCount.set(0)
        } else {
          notificationStore.error(t('user.approval.approve_all_empty_error', {}, 'Unable to approve any users'))
          void loadPendingUsers()
        }
      } catch (error) {
        console.error('Failed during approve-all users flow:', error)
        notificationStore.error(t('user.approval.approve_all_error', {}, 'An error occurred while approving users. Please try again.'))
        void loadPendingUsers()
      } finally {
        isApprovingUser.set({})
      }
    }

    void approveUsersSequentially()
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
