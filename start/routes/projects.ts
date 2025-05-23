import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ProjectsController = () => import('#controllers/projects/projects_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ProjectsController, 'index']).as('projects.index')
    // Form tạo dự án mới
    router.get('/projects/create', [ProjectsController, 'create']).as('projects.create')
    // Lưu dự án mới
    router.post('/projects', [ProjectsController, 'store']).as('projects.store')
    // Xem chi tiết dự án
    router.get('/projects/:id', [ProjectsController, 'show']).as('projects.show')
    // Xóa dự án
    router.delete('/projects/:id', [ProjectsController, 'destroy']).as('projects.destroy')
    // Thêm thành viên vào dự án
    router.post('/projects/members', [ProjectsController, 'addMember']).as('projects.members.add')
  })
  .use([middleware.auth(), middleware.requireOrg()])
