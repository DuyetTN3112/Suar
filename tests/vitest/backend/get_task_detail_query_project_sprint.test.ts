import { afterEach, expect, test, vi } from 'vitest'

const sprintId = '385cb80f-b605-4478-86ee-462828a43978'

const taskExternalDependenciesMock = vi.hoisted(() => ({
  lifecycle: {
    findTaskDetail: vi.fn(),
    findExistingApplication: vi.fn(),
  },
  user: {
    findUserIdentities: vi.fn(),
  },
  org: {
    findOrganizationSummaries: vi.fn(),
  },
  project: {
    findProjectSummaries: vi.fn(),
  },
  permission: {
    getOrgRoleName: vi.fn(),
    getProjectRoleName: vi.fn(),
  },
  activeAssignmentReader: {
    findActiveAssignment: vi.fn(),
  },
  audit: {
    listTaskAuditTrail: vi.fn(),
  },
  review: {
    getTaskReviewZoneSummary: vi.fn(),
    getTaskReviewDetail: vi.fn(),
  },
  sprint: {
    findSprint: vi.fn(),
  },
}))

vi.mock('#composition/task_external_dependencies_composition', () => ({
  taskExternalDeps: taskExternalDependenciesMock,
}))

afterEach(() => {
  vi.restoreAllMocks()
})

test('task detail query resolves sprint id and sprint name through the sprint port', async () => {
  const [
    { default: GetTaskDetailDTO },
    { default: GetTaskDetailQuery },
    { taskExternalDeps },
    { makeSystemTaskActionContext },
  ] = await Promise.all([
    import('#modules/tasks/actions/dtos/request/get_task_detail_dto'),
    import('#modules/tasks/actions/queries/get_task_detail_query'),
    import('#composition/task_external_dependencies_composition'),
    import('#modules/tasks/actions/task_action_context'),
  ])

  vi.spyOn(taskExternalDeps.lifecycle, 'findTaskDetail').mockResolvedValue({
    id: 'task-1',
    title: 'Task 1',
    description: 'Task description',
    status: 'todo',
    task_status_id: null,
    priority: 'high',
    label: 'feature',
    organization_id: 'org-1',
    project_id: 'project-1',
    project_sprint_id: sprintId,
    creator_id: 'user-1',
    assigned_to: null,
    updated_by: null,
    task_visibility: 'internal',
  })
  vi.spyOn(taskExternalDeps.lifecycle, 'findExistingApplication').mockResolvedValue(null)
  vi.spyOn(taskExternalDeps.user, 'findUserIdentities').mockResolvedValue([])
  vi.spyOn(taskExternalDeps.org, 'findOrganizationSummaries').mockResolvedValue([
    {
      id: 'org-1',
      name: 'Org 1',
      logo: null,
    },
  ])
  vi.spyOn(taskExternalDeps.project, 'findProjectSummaries').mockResolvedValue([
    {
      id: 'project-1',
      name: 'Project 1',
      ownerId: 'owner-1',
    },
  ])
  vi.spyOn(taskExternalDeps.permission, 'getOrgRoleName').mockResolvedValue(null)
  vi.spyOn(taskExternalDeps.permission, 'getProjectRoleName').mockResolvedValue(null)
  if (!taskExternalDeps.activeAssignmentReader) {
    throw new Error('Task active-assignment reader is required by the detail query')
  }
  vi.spyOn(taskExternalDeps.activeAssignmentReader, 'findActiveAssignment').mockResolvedValue(null)
  vi.spyOn(taskExternalDeps.audit, 'listTaskAuditTrail').mockResolvedValue([])
  vi.spyOn(taskExternalDeps.review, 'getTaskReviewZoneSummary').mockResolvedValue(null)
  vi.spyOn(taskExternalDeps.review, 'getTaskReviewDetail').mockResolvedValue(null)
  const findSprint = vi
    .spyOn(taskExternalDeps.sprint, 'findSprint')
    .mockResolvedValue({ id: sprintId, name: 'Sprint 4' })

  const query = new GetTaskDetailQuery(
    makeSystemTaskActionContext('user-1'),
    taskExternalDeps
  )
  const result = await query.execute(
    new GetTaskDetailDTO({
      task_id: 'task-1',
      include_audit_logs: false,
      include_versions: false,
      include_child_tasks: false,
      audit_logs_limit: 20,
    })
  )

  expect(findSprint).toHaveBeenCalledWith('project-1', sprintId)
  expect(result.task['projectSprintId']).toBe(sprintId)
  expect(result.task['projectSprintName']).toBe('Sprint 4')
})
