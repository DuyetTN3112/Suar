import { writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { notificationStore } from '@/stores/notification_store.svelte'
import type { User } from '../types'

export function createAddUsers() {
  const addUserModalOpen = writable(false)
  const allSystemUsers = writable<User[]>([])
  const selectedUserIds = writable<string[]>([])
  const searchUserTerm = writable('')
  const isLoadingSystemUsers = writable(false)
  const isAddingUsers = writable(false)
  const currentPage = writable(1)
  const totalPages = writable(1)

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
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Không thể tải danh sách người dùng')
      }
      if (result.users) {
        allSystemUsers.set(result.users.data || [])
        currentPage.set(result.users.meta?.current_page || 1)
        totalPages.set(result.users.meta?.last_page || 1)
      } else {
        allSystemUsers.set([])
        currentPage.set(1)
        totalPages.set(1)
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách người dùng trong hệ thống:', error)
      notificationStore.error('Không thể tải danh sách người dùng')
      allSystemUsers.set([])
      currentPage.set(1)
      totalPages.set(1)
    } finally {
      isLoadingSystemUsers.set(false)
    }
  }

  function openAddUserModal(searchTerm: string) {
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
        user_ids: userIds,
      },
      {
        preserveState: true,
        onSuccess: () => {
          notificationStore.success('Đã thêm người dùng vào tổ chức thành công')
          addUserModalOpen.set(false)
          isAddingUsers.set(false)
          selectedUserIds.set([])
          router.reload({ only: ['users'] })
        },
        onError: (errors: any) => {
          console.error('Lỗi khi thêm người dùng vào tổ chức:', errors)
          isAddingUsers.set(false)
          notificationStore.error(errors.message || 'Không thể thêm người dùng vào tổ chức')
        },
      }
    )
  }

  return {
    addUserModalOpen,
    allSystemUsers,
    selectedUserIds,
    searchUserTerm,
    isLoadingSystemUsers,
    isAddingUsers,
    currentPage,
    totalPages,
    loadAllSystemUsers,
    openAddUserModal,
    handleSearchUsers,
    toggleUserSelection,
    handleAddUsersToOrganization,
  }
}
