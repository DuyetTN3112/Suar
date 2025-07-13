import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { throttle } from '#start/limiter'

const ListProjectsController = () => import('#controllers/projects/list_projects_controller')
const CreateProjectController = () => import('#controllers/projects/create_project_controller')
const StoreProjectController = () => import('#controllers/projects/store_project_controller')
const ShowProjectController = () => import('#controllers/projects/show_project_controller')
const DeleteProjectController = () => import('#controllers/projects/delete_project_controller')
const AddProjectMemberController = () =>
  import('#controllers/projects/add_project_member_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ListProjectsController, 'handle']).as('projects.index')
    // Form tạo dự án mới
    router.get('/projects/create', [CreateProjectController, 'handle']).as('projects.create')
    // Lưu dự án mới
    router.post('/projects', [StoreProjectController, 'handle']).as('projects.store')
    // Xem chi tiết dự án
    router.get('/projects/:id', [ShowProjectController, 'handle']).as('projects.show')
    // Xóa dự án
    router.delete('/projects/:id', [DeleteProjectController, 'handle']).as('projects.destroy')
    // Thêm thành viên vào dự án
    router
      .post('/projects/members', [AddProjectMemberController, 'handle'])
      .as('projects.members.add')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
