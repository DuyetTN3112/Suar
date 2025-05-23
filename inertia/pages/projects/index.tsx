import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ProjectsIndexProps, Project } from './types'
import useTranslation from '@/hooks/use_translation'
import { router } from '@inertiajs/react'
import { formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Building, ArrowRight } from 'lucide-react'

export default function Projects({ projects, auth, showOrganizationRequiredModal = false }: ProjectsIndexProps & { showOrganizationRequiredModal?: boolean }) {
  console.log('\n=== [ProjectsIndex] Component được render ===')
  console.log('[ProjectsIndex] Thời gian render:', new Date().toISOString())
  console.log('[ProjectsIndex] Props nhận được:', {
    projectsCount: projects?.length || 0,
    hasAuth: !!auth,
    showOrganizationRequiredModal
  })
  
  const { t } = useTranslation()
  const [showOrganizationModal, setShowOrganizationModal] = React.useState(false)
  
  // Kiểm tra xem người dùng có tổ chức hiện tại không
  const hasCurrentOrganization = auth?.user?.current_organization_id !== null &&
                                auth?.user?.current_organization_id !== undefined
  
  console.log('[ProjectsIndex] Auth user:', auth?.user?.id, auth?.user?.email)
  console.log('[ProjectsIndex] Current organization ID:', auth?.user?.current_organization_id)
  console.log('[ProjectsIndex] Has current organization:', hasCurrentOrganization)
  console.log('[ProjectsIndex] Show organization required modal prop:', showOrganizationRequiredModal)
  
  // Kiểm tra session để xem có cần hiển thị modal không
  React.useEffect(() => {
    console.log('[ProjectsIndex] useEffect được gọi')
    console.log('[ProjectsIndex] Thời gian useEffect:', new Date().toISOString())
    
    // Sử dụng prop showOrganizationRequiredModal được truyền từ backend
    console.log('[ProjectsIndex] showOrganizationRequiredModal prop:', showOrganizationRequiredModal)
    
    // Kiểm tra cả prop và các cách khác để đảm bảo tương thích
    const showOrgModalFromSession = (window as any).__inertia?.page?.props?.showOrganizationRequiredModal === true
    const showOrgModalFromCookie = document.cookie.includes('show_organization_required_modal=true')
    
    console.log('[ProjectsIndex] Additional checks:', {
      fromSession: showOrgModalFromSession,
      fromCookie: showOrgModalFromCookie
    })
    
    // Sử dụng prop hoặc các cách khác nếu prop không có
    const shouldShowModal = showOrganizationRequiredModal || showOrgModalFromSession || showOrgModalFromCookie
    
    console.log('[ProjectsIndex] Should show modal:', shouldShowModal)
    console.log('[ProjectsIndex] Has current organization:', hasCurrentOrganization)
    
    if (shouldShowModal && !hasCurrentOrganization) {
      console.log('[ProjectsIndex] Showing organization modal')
      setShowOrganizationModal(true)
    }
    
    // Ghi log thông tin về window.performance nếu có
    if (window.performance) {
      const perfData = window.performance.timing
      console.log('[ProjectsIndex] Performance data:', {
        navigationStart: perfData.navigationStart,
        domLoading: perfData.domLoading,
        domInteractive: perfData.domInteractive,
        domComplete: perfData.domComplete,
        loadEventEnd: perfData.loadEventEnd,
        totalPageLoad: perfData.loadEventEnd - perfData.navigationStart
      })
    }
    
    return () => {
      console.log('[ProjectsIndex] useEffect cleanup được gọi')
    }
  }, [hasCurrentOrganization, showOrganizationRequiredModal])
  
  const handleCreateClick = () => {
    console.log('[ProjectsIndex] handleCreateClick được gọi')
    if (!hasCurrentOrganization) {
      console.log('[ProjectsIndex] Không có tổ chức hiện tại, hiển thị modal')
      setShowOrganizationModal(true)
      return
    }
    console.log('[ProjectsIndex] Chuyển hướng đến trang tạo dự án')
    router.visit('/projects/create', {
      onStart: () => console.log('[ProjectsIndex] Bắt đầu chuyển hướng đến /projects/create'),
      onSuccess: () => console.log('[ProjectsIndex] Chuyển hướng thành công đến /projects/create'),
      onError: (errors) => console.error('[ProjectsIndex] Lỗi khi chuyển hướng:', errors),
      onFinish: () => console.log('[ProjectsIndex] Kết thúc quá trình chuyển hướng')
    })
  }
  
  const handleViewProject = (id: number) => {
    console.log(`[ProjectsIndex] handleViewProject được gọi với id: ${id}`)
    router.visit(`/projects/${id}`, {
      onStart: () => console.log(`[ProjectsIndex] Bắt đầu chuyển hướng đến /projects/${id}`),
      onSuccess: () => console.log(`[ProjectsIndex] Chuyển hướng thành công đến /projects/${id}`),
      onError: (errors) => console.error(`[ProjectsIndex] Lỗi khi chuyển hướng đến /projects/${id}:`, errors),
      onFinish: () => console.log(`[ProjectsIndex] Kết thúc quá trình chuyển hướng đến /projects/${id}`)
    })
  }
  
  const handleDeleteProject = (id: number) => {
    console.log(`[ProjectsIndex] handleDeleteProject được gọi với id: ${id}`)
    if (confirm(t('common.confirm_delete', {}, 'Bạn có chắc chắn muốn xóa?'))) {
      console.log(`[ProjectsIndex] Xác nhận xóa dự án id: ${id}`)
      router.delete(`/projects/${id}`, {
        onStart: () => console.log(`[ProjectsIndex] Bắt đầu xóa dự án id: ${id}`),
        onSuccess: () => console.log(`[ProjectsIndex] Xóa dự án thành công id: ${id}`),
        onError: (errors) => console.error(`[ProjectsIndex] Lỗi khi xóa dự án id: ${id}:`, errors),
        onFinish: () => console.log(`[ProjectsIndex] Kết thúc quá trình xóa dự án id: ${id}`)
      })
    } else {
      console.log(`[ProjectsIndex] Hủy xóa dự án id: ${id}`)
    }
  }
  
  const handleGoToOrganizations = () => {
    console.log('[ProjectsIndex] handleGoToOrganizations được gọi')
    router.visit('/organizations', {
      onStart: () => console.log('[ProjectsIndex] Bắt đầu chuyển hướng đến /organizations'),
      onSuccess: () => console.log('[ProjectsIndex] Chuyển hướng thành công đến /organizations'),
      onError: (errors) => console.error('[ProjectsIndex] Lỗi khi chuyển hướng đến /organizations:', errors),
      onFinish: () => console.log('[ProjectsIndex] Kết thúc quá trình chuyển hướng đến /organizations')
    })
  }
  
  const pageTitle = t('project.project_list', {}, 'Quản lý dự án')

  console.log('[ProjectsIndex] Render component')
  
  return (
    <AppLayout title={pageTitle}>
      <Head title={pageTitle} />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          
          <Button 
            size="sm"
            onClick={handleCreateClick}
          >
            {t('project.add_project', {}, 'Tạo dự án mới')}
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('project.projects', {}, 'Danh sách dự án')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('project.name', {}, 'Tên dự án')}</TableHead>
                  <TableHead>{t('project.organization', {}, 'Tổ chức')}</TableHead>
                  <TableHead>{t('project.status', {}, 'Trạng thái')}</TableHead>
                  <TableHead>{t('project.manager', {}, 'Quản lý')}</TableHead>
                  <TableHead>{t('project.start_date', {}, 'Ngày bắt đầu')}</TableHead>
                  <TableHead>{t('project.end_date', {}, 'Ngày kết thúc')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', {}, 'Thao tác')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      {t('project.no_projects', {}, 'Chưa có dự án nào')}
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project: Project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.organization_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {project.status}
                        </span>
                      </TableCell>
                      <TableCell>{project.manager_name || '-'}</TableCell>
                      <TableCell>{project.start_date ? formatDate(project.start_date) : '-'}</TableCell>
                      <TableCell>{project.end_date ? formatDate(project.end_date) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleViewProject(project.id)}
                          >
                            {t('common.view', {}, 'Xem')}
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            {t('common.delete', {}, 'Xóa')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal thông báo yêu cầu tham gia tổ chức */}
      <Dialog open={showOrganizationModal} onOpenChange={setShowOrganizationModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              <span>{t('organization.required_title', {}, 'Yêu cầu tổ chức')}</span>
            </DialogTitle>
            <DialogDescription>
              {t('organization.required_description', {}, 'Để sử dụng tính năng quản lý dự án, bạn cần tham gia hoặc tạo một tổ chức.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('organization.required_explanation', {}, 'Dự án được quản lý trong phạm vi tổ chức. Vui lòng tham gia hoặc tạo một tổ chức để tiếp tục.')}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrganizationModal(false)}>
              {t('common.cancel', {}, 'Hủy')}
            </Button>
            <Button onClick={handleGoToOrganizations}>
              {t('organization.go_to_organizations', {}, 'Đi đến trang tổ chức')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
  console.log('[ProjectsIndex] Kết thúc render component')
  console.log('=== [ProjectsIndex] Kết thúc component ===\n')
  
  return () => {
    console.log('[ProjectsIndex] Component unmount')
  }
}