import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { throttle } from '#start/limiter'

const ListProjectsController = () =>
  import('#modules/projects/controllers/list_projects_controller')
const CreateProjectController = () =>
  import('#modules/projects/controllers/create_project_controller')
const CreateProjectWithStaffingController = () =>
  import('#modules/projects/controllers/create_project_with_staffing_controller')
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
const SwitchProjectApiController = () =>
  import('#modules/projects/controllers/switch_project_controller')
const ListProjectSprintsController = () =>
  import('#modules/sprints/controllers/list_project_sprints_controller')
const CreateProjectSprintController = () =>
  import('#modules/sprints/controllers/create_project_sprint_controller')
const ShowProjectSprintController = () =>
  import('#modules/sprints/controllers/show_project_sprint_controller')
const UpdateProjectSprintController = () =>
  import('#modules/sprints/controllers/update_project_sprint_controller')
const CloseProjectSprintReviewController = () =>
  import('#modules/reviews/controllers/close_project_sprint_review_controller')
const MoveTaskToSprintController = () =>
  import('#modules/sprints/controllers/move_task_to_sprint_controller')
const GetSprintBoardController = () =>
  import('#modules/sprints/controllers/get_sprint_board_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ListProjectsController, 'handle']).as('projects.index')
    // Chuyển đổi dự án hiện tại
    router
      .post('/switch-project', [SwitchProjectApiController, 'handle'])
      .as('projects.switch')
      .use([middleware.bindHttpTransport('api-compat')])
    // Form tạo dự án mới
    router.get('/projects/create', [CreateProjectController, 'handle']).as('projects.create')
    // Lưu dự án mới
    router.post('/projects', [CreateProjectWithStaffingController, 'handle']).as('projects.store')
    // Xem chi tiết dự án
    router.get('/projects/:projectId', [ShowProjectController, 'handle']).as('projects.show')
    // Xóa dự án
    router.delete('/projects/:projectId', [DeleteProjectController, 'handle']).as('projects.destroy')
    // Thêm thành viên vào dự án
    router
      .post('/projects/members', [AddProjectMemberController, 'handle'])
      .as('projects.members.store')
    // Cập nhật vai trò thành viên
    router
      .put('/projects/members/:userId', [UpdateProjectMemberController, 'handle'])
      .as('projects.members.update')
    // Xóa thành viên khỏi dự án
    router
      .delete('/projects/members/:userId', [RemoveProjectMemberController, 'handle'])
      .as('projects.members.destroy')
    // List org member candidates for adding to project
    router
      .get('/projects/:projectId/member-candidates', [ListProjectMemberCandidatesController, 'handle'])
      .as('projects.member_candidates')

  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

router
  .post('/api/v1/me/projects/switch', [SwitchProjectApiController, 'handle'])
  .as('api.v1.me.projects.switch.store')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
  ])

router
  .group(() => {
    router
      .get('/projects/:projectId/sprints', [ListProjectSprintsController, 'handle'])
      .as('api.v1.projects.sprints.index')
    router
      .post('/projects/:projectId/sprints', [CreateProjectSprintController, 'handle'])
      .as('api.v1.projects.sprints.store')
    router
      .get('/projects/:projectId/sprints/:sprintId', [ShowProjectSprintController, 'handle'])
      .as('api.v1.projects.sprints.show')
    router
      .patch('/projects/:projectId/sprints/:sprintId', [UpdateProjectSprintController, 'handle'])
      .as('api.v1.projects.sprints.update')
    router
      .post('/projects/:projectId/sprints/:sprintId/open-review', [
        CloseProjectSprintReviewController,
        'handle',
      ])
      .as('api.v1.projects.sprints.open_review')
    router
      .patch('/projects/:projectId/tasks/:taskId/sprint', [MoveTaskToSprintController, 'handle'])
      .as('api.v1.projects.tasks.sprint.update')
    router
      .get('/projects/:projectId/sprint-board', [GetSprintBoardController, 'handle'])
      .as('api.v1.projects.sprint_board.show')
  })
  .prefix('/api/v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
  ])
