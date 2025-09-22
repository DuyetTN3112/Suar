import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { throttle } from '#start/limiter'

const ListProjectsController = () =>
  import('#modules/projects/controllers/list_projects_controller')
const CreateProjectController = () =>
  import('#modules/projects/controllers/create_project_controller')
const StoreProjectController = () =>
  import('#modules/projects/controllers/store_project_controller')
const ShowProjectController = () => import('#modules/projects/controllers/show_project_controller')
const DeleteProjectController = () =>
  import('#modules/projects/controllers/delete_project_controller')
const AddProjectMemberController = () =>
  import('#modules/projects/controllers/add_project_member_controller')
const UpdateProjectMemberController = () =>
  import('#modules/projects/controllers/update_project_member_controller')
const ListProjectMemberCandidatesController = () =>
  import('#modules/projects/controllers/list_project_member_candidates_controller')
const RemoveProjectMemberController = () =>
  import('#modules/projects/controllers/remove_project_member_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ListProjectsController, 'handle']).as('projects.index')
    // Chuyển đổi dự án hiện tại
    router
      .post('/switch-project', [() => import('#modules/projects/controllers/switch_project_controller'), 'handle'])
      .as('projects.switch')
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
    // Cập nhật vai trò thành viên
    router
      .put('/projects/members/:userId', [UpdateProjectMemberController, 'handle'])
      .as('projects.members.update')
    // Xóa thành viên khỏi dự án
    router
      .delete('/projects/members/:userId', [RemoveProjectMemberController, 'handle'])
      .as('projects.members.remove')
    // List org member candidates for adding to project
    router
      .get('/projects/:id/member-candidates', [ListProjectMemberCandidatesController, 'handle'])
      .as('projects.member_candidates')

  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
