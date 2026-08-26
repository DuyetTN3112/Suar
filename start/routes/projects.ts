import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'
import { throttle } from '#start/limiter'

const ListProjectsController = () =>
  import('#modules/projects/controllers/project-context/list_projects_controller')
const CreateProjectController = () =>
  import('#modules/organizations/controllers/projects/create_project_controller')
const CreateProjectWithStaffingController = () =>
  import('#modules/projects/controllers/project-context/create_project_with_staffing_controller')
const ShowProjectController = () =>
  import('#modules/projects/controllers/project-context/show_project_controller')
const DeleteProjectController = () =>
  import('#modules/projects/controllers/project-context/delete_project_controller')
const AddProjectMemberController = () =>
  import('#modules/projects/controllers/project-members/add_project_member_controller')
const UpdateProjectMemberController = () =>
  import('#modules/projects/controllers/project-members/update_project_member_controller')
const ListProjectMemberCandidatesController = () =>
  import('#modules/projects/controllers/project-members/list_project_member_candidates_controller')
const RemoveProjectMemberController = () =>
  import('#modules/projects/controllers/project-members/remove_project_member_controller')
const SwitchProjectApiController = () =>
  import('#modules/projects/controllers/project-context/switch_project_controller')
const ListProjectSprintsController = () =>
  import('#modules/sprints/controllers/project-sprint/list_project_sprints_controller')
const CreateProjectSprintController = () =>
  import('#modules/sprints/controllers/project-sprint/create_project_sprint_controller')
const ShowProjectSprintController = () =>
  import('#modules/sprints/controllers/project-sprint/show_project_sprint_controller')
const UpdateProjectSprintController = () =>
  import('#modules/sprints/controllers/project-sprint/update_project_sprint_controller')
const StartProjectSprintController = () =>
  import('#modules/sprints/controllers/project-sprint/start_project_sprint_controller')
const CloseProjectSprintReviewController = () =>
  import('#modules/reviews/controllers/sprint-review/close_project_sprint_review_controller')
const MoveTaskToSprintController = () =>
  import('#modules/sprints/controllers/task-sprint-assignment/move_task_to_sprint_controller')
const GetSprintBoardController = () =>
  import('#modules/sprints/controllers/sprint-board/get_sprint_board_controller')
const GetProjectBacklogController = () =>
  import('#modules/sprints/controllers/project-backlog/get_project_backlog_controller')
const ReorderProjectBacklogController = () =>
  import('#modules/sprints/controllers/project-backlog/reorder_project_backlog_controller')
const ListTaskSprintAssignmentHistoryController = () =>
  import('#modules/sprints/controllers/task-sprint-assignment/list_task_sprint_assignment_history_controller')
const ListTasksController = () => import('#modules/tasks/controllers/list_tasks_controller')
const ShowTaskReviewBoardController = () =>
  import('#modules/reviews/controllers/task-review/show_task_review_board_controller')
const ShowSprintReverseReviewBoardController = () =>
  import('#modules/reviews/controllers/sprint-review/show_sprint_reverse_review_board_controller')
const SearchPageController = () =>
  import('#modules/http/controllers/search-discovery/search_page_controller')

// Nhóm routes cho dự án, yêu cầu đăng nhập và có tổ chức hiện tại
router
  .group(() => {
    // Danh sách dự án
    router.get('/projects', [ListProjectsController, 'handle']).as('projects.index')
    // Chuyển đổi dự án hiện tại
    router
      .post('/switch-project', [SwitchProjectApiController, 'handle'])
      .as('projects.switch')
      .use([middleware.bindHttpTransport('api-compat'), middleware.requireProjectWorkspace()])
    // Form tạo dự án mới
    router.get('/projects/create', [CreateProjectController, 'handle']).as('projects.create')
    // Lưu dự án mới
    router.post('/projects', [CreateProjectWithStaffingController, 'handle']).as('projects.store')
    // Canonical project workspace boards
    router
      .get('/projects/:projectId/tasks', [ListTasksController, 'handle'])
      .as('projects.tasks.board')
      .use([middleware.requireProjectWorkspace()])
    router
      .get('/projects/:projectId/search', [SearchPageController, 'handle'])
      .as('projects.search.index')
      .use([middleware.requireProjectWorkspace()])
    router
      .get('/projects/:projectId/reviews/tasks', [ShowTaskReviewBoardController, 'handle'])
      .as('projects.reviews.tasks.board')
    router
      .get('/projects/:projectId/reviews/assigners', [
        ShowSprintReverseReviewBoardController,
        'handle',
      ])
      .as('projects.reviews.assigners.board')
    router
      .get('/projects/:projectId/reviews/environment', [
        ShowSprintReverseReviewBoardController,
        'handle',
      ])
      .as('projects.reviews.environment.board')
    // Xem chi tiết dự án
    router
      .get('/projects/:projectId', [ShowProjectController, 'handle'])
      .as('projects.show')
      .use([middleware.requireProjectWorkspace()])
    // Xóa dự án
    router
      .delete('/projects/:projectId', [DeleteProjectController, 'handle'])
      .as('projects.destroy')
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
      .get('/projects/:projectId/member-candidates', [
        ListProjectMemberCandidatesController,
        'handle',
      ])
      .as('projects.member_candidates')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Personal workspace aliases use the current project from the session when it
// exists. The controllers render an empty board for users without a project.
router
  .group(() => {
    router
      .get('/reviews/tasks', [ShowTaskReviewBoardController, 'handle'])
      .as('reviews.tasks.board')
    router
      .get('/reviews/assigners', [ShowSprintReverseReviewBoardController, 'handle'])
      .as('reviews.assigners.board')
    router
      .get('/reviews/environment', [ShowSprintReverseReviewBoardController, 'handle'])
      .as('reviews.environment.board')
  })
  .use([middleware.auth(), throttle])

router
  .post('/api/v1/me/projects/switch', [SwitchProjectApiController, 'handle'])
  .as('api.v1.me.projects.switch.store')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireProjectWorkspace(),
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
      .post('/projects/:projectId/sprints/:sprintId/start', [
        StartProjectSprintController,
        'handle',
      ])
      .as('api.v1.projects.sprints.start')
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
    router
      .get('/projects/:projectId/backlog', [GetProjectBacklogController, 'handle'])
      .as('api.v1.projects.backlog.show')
    router
      .post('/projects/:projectId/tasks/:taskId/backlog-order', [
        ReorderProjectBacklogController,
        'handle',
      ])
      .as('api.v1.projects.tasks.backlog_order.update')
    router
      .get('/projects/:projectId/tasks/:taskId/sprint-history', [
        ListTaskSprintAssignmentHistoryController,
        'handle',
      ])
      .as('api.v1.projects.tasks.sprint_history.index')
  })
  .prefix('/api/v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
  ])
