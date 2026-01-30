import { test } from '@japa/runner'

import type { ReviewTaskBoardReader } from '#modules/reviews/actions/ports/outbound/review_task_board_reader'
import type { ReviewWorkflowNavigationReader } from '#modules/reviews/actions/ports/outbound/review_workflow_navigation_reader'
import GetTaskReviewBoardPageQuery from '#modules/reviews/actions/queries/get_task_review_board_page_query'
import GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/get_task_review_board_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  emptyTaskReviewBoardColumns,
  TASK_REVIEW_WORKFLOW_STATUSES,
  type TaskReviewBoardResult,
} from '#modules/reviews/domain/task_review_workflow'

const context: ReviewActionContext = {
  userId: 'user-1',
  ip: '127.0.0.1',
  userAgent: 'test',
  organizationId: 'org-1',
}

function makeBoard(projectId: string, taskId: string): TaskReviewBoardResult {
  const columns = emptyTaskReviewBoardColumns()
  columns[0]?.cards.push({
    taskId,
    workflowId: 'workflow-1',
    status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW,
    workflowStatus: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW,
    title: 'Review task',
    description: null,
    taskStatus: 'done',
    priority: null,
    label: null,
    difficulty: null,
    dueDate: null,
    estimatedTime: null,
    revieweeId: 'reviewee-1',
    revieweeName: 'Reviewee',
    creatorId: 'creator-1',
    creatorName: 'Creator',
    projectId,
    reviewCount: 0,
    requiredReviewCount: 1,
    lastActivityAt: null,
    waitingOnMe: true,
  })

  return { projectId, columns }
}

test.group('Unit | Get task review board page query', () => {
  test('owns board, navigation, selection, detail, and workspace transition', async ({
    assert,
  }) => {
    const projectId = 'project-1'
    const taskId = 'task-1'
    const board = makeBoard(projectId, taskId)
    const detail = { task: { id: taskId } }
    const boards: ReviewTaskBoardReader = {
      findAccess(receivedProjectId, actorId) {
        assert.equal(receivedProjectId, projectId)
        assert.equal(actorId, context.userId)
        return Promise.resolve({ projectExists: true, canRead: true })
      },
      loadBoard(receivedProjectId, actorId) {
        assert.equal(receivedProjectId, projectId)
        assert.equal(actorId, context.userId)
        return Promise.resolve(board)
      },
    }
    const navigation: ReviewWorkflowNavigationReader = {
      getProjectSummary(receivedProjectId) {
        assert.equal(receivedProjectId, projectId)
        return Promise.resolve({ id: projectId, name: 'Project' })
      },
      getTaskReviewDetail(receivedTaskId) {
        assert.equal(receivedTaskId, taskId)
        return Promise.resolve(detail)
      },
      getSprintReverseWorkflowLocation() {
        return Promise.reject(new Error('Unexpected sprint navigation read'))
      },
      getTaskWorkflowLocation() {
        return Promise.reject(new Error('Unexpected task workflow navigation read'))
      },
      getTaskProjectId() {
        return Promise.reject(new Error('Unexpected task project navigation read'))
      },
    }

    const result = await new GetTaskReviewBoardPageQuery(
      new GetTaskReviewBoardQuery(context, boards),
      navigation
    ).execute({
      projectId,
      requestedTaskId: taskId,
    })

    assert.deepEqual(result, {
      board,
      selectedTaskId: taskId,
      detail,
      project: { id: projectId, name: 'Project' },
      workspaceTransition: { currentProjectId: projectId },
    })
  })

  test('does not load detail for a task outside the visible board', async ({ assert }) => {
    const projectId = 'project-1'
    let detailReads = 0
    const boards: ReviewTaskBoardReader = {
      findAccess() {
        return Promise.resolve({ projectExists: true, canRead: true })
      },
      loadBoard() {
        return Promise.resolve({ projectId, columns: emptyTaskReviewBoardColumns() })
      },
    }
    const navigation: ReviewWorkflowNavigationReader = {
      getProjectSummary() {
        return Promise.resolve({ id: projectId, name: 'Project' })
      },
      getTaskReviewDetail() {
        detailReads += 1
        return Promise.resolve({})
      },
      getSprintReverseWorkflowLocation() {
        return Promise.reject(new Error('Unexpected sprint navigation read'))
      },
      getTaskWorkflowLocation() {
        return Promise.reject(new Error('Unexpected task workflow navigation read'))
      },
      getTaskProjectId() {
        return Promise.reject(new Error('Unexpected task project navigation read'))
      },
    }

    const result = await new GetTaskReviewBoardPageQuery(
      new GetTaskReviewBoardQuery(context, boards),
      navigation
    ).execute({
      projectId,
      requestedTaskId: 'hidden-task',
    })

    assert.isNull(result.selectedTaskId)
    assert.isNull(result.detail)
    assert.equal(detailReads, 0)
  })
})
