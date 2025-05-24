import React from 'react'
import { router } from '@inertiajs/react'

interface OrganizationSwitcherProps {
  organizationId: string | number
}

export function OrganizationSwitcher({ organizationId }: OrganizationSwitcherProps) {
  const switchOrganization = async () => {
    try {
      const currentPath = window.location.pathname
      const orgId = String(organizationId)

      router.post('/switch-organization', {
        organization_id: orgId,
        current_path: currentPath
      }, {
        preserveState: false,
        onSuccess: () => {
          // Tạo thời gian chờ ngắn để đảm bảo session được cập nhật trên server
          setTimeout(() => {
            // Tải lại trang hiện tại với hard refresh để đảm bảo dữ liệu mới
            window.location.href = currentPath
          }, 100)
        },
        onError: (errors) => {
          // Keep error logging for actual errors
          console.error('Lỗi khi gửi request chuyển đổi tổ chức:', errors)
        }
      })
    } catch (error) {
      // Keep error logging for actual errors
      console.error('Lỗi khi gửi request chuyển đổi tổ chức:', error)
    }
  }

  return (
    <button onClick={switchOrganization}>
      Switch Organization
    </button>
  )
}
