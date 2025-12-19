import { router } from '@inertiajs/svelte'
import { writable } from 'svelte/store'

import { buildOffsetPagination } from '@/apps/user/shared/lib/pagination'
import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'

import type { UserDirectoryRecord } from '../types'

interface SystemUsersResponse {
  data: UserDirectoryRecord[]
  pagination?: {
    page?: number
    perPage?: number
    total?: number
    hasNextPage?: boolean
  }
}

interface RouterErrorBag {
  message?: string
}

export function createAddUsers() {
  const addUserModalOpen = writable(false)
  const allSystemUsers = writable<UserDirectoryRecord[]>([])
  const selectedUserIds = writable<string[]>([])
  const searchUserTerm = writable('')
  const isLoadingSystemUsers = writable(false)
  const isAddingUsers = writable(false)
  const pagination = writable<OffsetPagePagination>({
    mode: 'offset',
    page: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  async function loadAllSystemUsers(page = 1, search = '') {
    isLoadingSystemUsers.set(true)
    try {
      const response = await fetch(
        `/api/system-users?page=${page}${search ? `&search=${search}` : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HTTP error! status: ${response.status}, response:`, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = (await response.json()) as SystemUsersResponse
      if (Array.isArray(result.data)) {
        allSystemUsers.set(result.data)
        const pageNumber = result.pagination?.page ?? 1
        const perPage = result.pagination?.perPage ?? 10
        const total = result.pagination?.total ?? result.data.length
        pagination.set(buildOffsetPagination({
          page: pageNumber,
          perPage,
          total,
          hasNextPage: result.pagination?.hasNextPage,
        }))
      } else {
        allSystemUsers.set([])
        pagination.set({
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 0,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng trong hệ thống:', error)
      notificationStore.error('Không thể tải danh sách người dùng')
      allSystemUsers.set([])
      pagination.set({
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 0,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      })
    } finally {
      isLoadingSystemUsers.set(false)
    }
  }

  function openAddUserModal(searchTerm = '') {
    addUserModalOpen.set(true)
    selectedUserIds.set([])
    void loadAllSystemUsers(1, searchTerm)
  }

  function handleSearchUsers(e: Event, searchTerm: string) {
    e.preventDefault()
    void loadAllSystemUsers(1, searchTerm)
  }

  function toggleUserSelection(userId: string) {
    selectedUserIds.update((prevSelected) => {
      if (prevSelected.includes(userId)) {
        return prevSelected.filter((id) => id !== userId)
      } else {
        return [...prevSelected, userId]
      }
    })
  }

  function handleAddUsersToOrganization(userIds: string[]) {
    if (userIds.length === 0) {
      notificationStore.error('Vui lòng chọn ít nhất một người dùng')
      return
    }
    isAddingUsers.set(true)

    router.post(
      '/organizations/users/add',
      {
        userIds,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          notificationStore.success('Đã thêm người dùng vào tổ chức thành công')
          addUserModalOpen.set(false)
          isAddingUsers.set(false)
          selectedUserIds.set([])
          router.reload({ only: ['users', 'flash'] })
        },
        onError: (errors: RouterErrorBag) => {
          console.error('Lỗi khi thêm người dùng vào tổ chức:', errors)
          isAddingUsers.set(false)
          notificationStore.error(errors.message ?? 'Không thể thêm người dùng vào tổ chức')
        },
      }
    )
  }

  return {
    addUserModalOpen,
    setAddUserModalOpen: (value: boolean) => {
      addUserModalOpen.set(value)
    },
    allSystemUsers,
    selectedUserIds,
    searchUserTerm,
    setSearchUserTerm: (value: string) => {
      searchUserTerm.set(value)
    },
    isLoadingSystemUsers,
    isAddingUsers,
    pagination,
    loadAllSystemUsers,
    openAddUserModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddUsersToOrganization,
  }
}
