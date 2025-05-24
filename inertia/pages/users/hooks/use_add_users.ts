import React from 'react'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { User } from '../types'
import useTranslation from '@/hooks/use_translation'

export const useAddUsers = () => {
  const { t } = useTranslation()
  const [addUserModalOpen, setAddUserModalOpen] = React.useState(false)
  const [allSystemUsers, setAllSystemUsers] = React.useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = React.useState<number[]>([])
  const [searchUserTerm, setSearchUserTerm] = React.useState('')
  const [isLoadingSystemUsers, setIsLoadingSystemUsers] = React.useState(false)
  const [isAddingUsers, setIsAddingUsers] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)

  // Lấy danh sách tất cả người dùng trong hệ thống
  const loadAllSystemUsers = async (page = 1, search = '') => {
    setIsLoadingSystemUsers(true)
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
        // Keep error logging for actual errors
        console.error(`HTTP error! status: ${response.status}, response:`, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Không thể tải danh sách người dùng')
      }
      if (result.users) {
        setAllSystemUsers(result.users.data || [])
        setCurrentPage(result.users.meta?.current_page || 1)
        setTotalPages(result.users.meta?.last_page || 1)
      } else {
        setAllSystemUsers([])
        setCurrentPage(1)
        setTotalPages(1)
      }
    } catch (error) {
      // Keep error logging for actual errors
      console.error('Lỗi khi lấy danh sách người dùng trong hệ thống:', error)
      toast.error(t('user.error.load_users_failed', {}, 'Không thể tải danh sách người dùng'))
      setAllSystemUsers([])
      setCurrentPage(1)
      setTotalPages(1)
    } finally {
      setIsLoadingSystemUsers(false)
    }
  }
  // Mở modal thêm người dùng và tải danh sách
  const openAddUserModal = () => {
    setAddUserModalOpen(true)
    setSelectedUserIds([])
    void loadAllSystemUsers(1, searchUserTerm)
  }
  // Xử lý tìm kiếm người dùng
  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault()
    void loadAllSystemUsers(1, searchUserTerm)
  }
  // Xử lý chọn/bỏ chọn người dùng
  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prevSelected) => {
      if (prevSelected.includes(userId)) {
        return prevSelected.filter((id) => id !== userId)
      } else {
        return [...prevSelected, userId]
      }
    })
  }
  // Xử lý thêm người dùng đã chọn vào tổ chức
  const handleAddUsersToOrganization = () => {
    if (selectedUserIds.length === 0) {
      toast.error(t('user.error.no_users_selected', {}, 'Vui lòng chọn ít nhất một người dùng'))
      return
    }
    setIsAddingUsers(true)
    // Sử dụng Inertia router để gửi POST request
    router.post(
      '/organizations/users/add',
      {
        user_ids: selectedUserIds,
      },
      {
        preserveState: true,
        onSuccess: () => {
          toast.success(
            t('user.success.users_added', {}, 'Đã thêm người dùng vào tổ chức thành công')
          )
          setAddUserModalOpen(false)
          setIsAddingUsers(false)
          setSelectedUserIds([])
          // Tải lại danh sách người dùng nhưng không tải lại toàn bộ trang
          router.reload({ only: ['users'] })
        },
        onError: (errors) => {
          console.error('Lỗi khi thêm người dùng vào tổ chức:', errors)
          setIsAddingUsers(false)
          toast.error(
            errors.message ||
              t('user.error.add_failed', {}, 'Không thể thêm người dùng vào tổ chức')
          )
        },
      }
    )
  }

  return {
    addUserModalOpen,
    setAddUserModalOpen,
    allSystemUsers,
    selectedUserIds,
    searchUserTerm,
    setSearchUserTerm,
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
