import { test } from '@japa/runner'

import SubmitTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_task_review_workflow_command'

test.group('Unit | Submit task review workflow command', () => {
  test('owns ensure then submit ordering and returns canonical navigation outcome', async ({
    assert,
  }) => {
    const calls: string[] = []
    const ensureWorkflow = {
      execute(input: { taskId: string }) {
        calls.push(`ensure:${input.taskId}`)
        return Promise.resolve({
          workflowId: 'workflow-1',
          taskId: input.taskId,
          status: 'awaiting_review' as const,
          requiredReviewCount: 1,
        })
      },
    }
    const submitReview = {
      execute(input: { workflowId: string; body: string }) {
        calls.push(`submit:${input.workflowId}:${input.body}`)
        return Promise.resolve({
          workflowId: input.workflowId,
          taskId: 'task-1',
          projectId: 'project-1',
        })
      },
    }

    const result = await new SubmitTaskReviewWorkflowCommand(
      ensureWorkflow as never,
      submitReview as never
    ).execute({
      taskId: 'task-1',
      body: 'Looks good',
    })

    assert.deepEqual(calls, ['ensure:task-1', 'submit:workflow-1:Looks good'])
    assert.deepEqual(result, {
      workflowId: 'workflow-1',
      taskId: 'task-1',
      projectId: 'project-1',
    })
  })
})
