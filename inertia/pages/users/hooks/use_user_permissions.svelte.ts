import { writable } from 'svelte/store'
import { router } from '@inertiajs/svelte'
import { toast } from 'svelte-sonner'
import type { User } from '../types'

export function createUserPermissions() {
  const editModalOpen = writable(false)
  const selectedUserId = writable<number | null>(null)
  const selectedUser = writable<User | null>(null)
  const selectedRoleId = writable<string>('')
  const isSubmitting = writable(false)

  function openEditPermissionsModal(user: User) {
    if (!user || !user.id) {
      toast.error('Không tìm thấy thông tin người dùng')
      return
    }
    selectedUserId.set(user.id)
    selectedUser.set(user)
    selectedRoleId.set(user.organization_role?.id ? String(user.organization_role.id) : '')
    editModalOpen.set(true)
  }

  function handleUpdatePermissions(e: Event, userId: number | null, roleId: string) {
    e.preventDefault()
    if (!userId || !roleId) {
      toast.error('Vui lòng chọn vai trò')
      return
    }
    isSubmitting.set(true)

    const roleIdNumber = Number.parseInt(roleId, 10)

    router.put(
      `/organizations/users/${userId}/update-permissions`,
      {
        role_id: roleIdNumber,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        preserveScroll: false,
        preserveState: false,
        onSuccess: () => {
          toast.success('Đã cập nhật quyền người dùng thành công')
          editModalOpen.set(false)
          isSubmitting.set(false)
          router.reload({ only: ['users'] })
        },
        onError: (errors: any) => {
          console.error('Lỗi khi cập nhật quyền:', errors)
          isSubmitting.set(false)
          toast.error(errors.message || 'Không thể cập nhật quyền người dùng')
        },
      }
    )
  }

  return {
    editModalOpen,
    selectedUserId,
    selectedUser,
    selectedRoleId,
    isSubmitting,
    openEditPermissionsModal,
    handleUpdatePermissions,
  }
}
