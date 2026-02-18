import type { TaskTransaction } from './task_transaction.js'

export interface TaskCompletionAccessTask {
  id: string
  organization_id: string
  creator_id: string
  assigned_to: string | null
}

export interface TaskSubmissionTask extends TaskCompletionAccessTask {
  title: string
  description: string
  status: string
  task_status_id: string
  verification_method: string
  project_id: string
  deleted_at: Date | null
  acceptance_criteria: string
  task_type: string
  difficulty: string | null
  expected_deliverables: unknown
}

export interface TaskSubmissionAssignment {
  id: string
  task_id: string
  assignee_id: string
  assignment_status: string
  assigned_by: string
}

export interface TaskSubmissionRecord extends Record<string, unknown> {
  id: string
  task_assignment_id: string
  task_id: string
  submitted_by: string
  summary: string
  implementation_notes: string | null
  known_limitations: string | null
  test_notes: string | null
  demo_url: string | null
  repository_url: string | null
  pull_request_url: string | null
  status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
  locked_at?: string | null
}

export interface TaskCommentRecord {
  id: string
  task_id: string
  author_id: string
}

export interface TaskMention {
  userId: string
  username: string
  mentionToken: string
}

export abstract class TaskCompletionRepository {
  abstract findAccessTask(taskId: string): Promise<TaskCompletionAccessTask | null>

  abstract lockSubmissionTask(
    taskId: string,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionTask | null>

  abstract lockActiveAssignment(
    taskId: string,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionAssignment | null>

  abstract lockSubmissionByAssignment(
    assignmentId: string,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionRecord | null>

  abstract upsertSubmission(
    existingId: string | null,
    payload: Record<string, unknown>,
    now: Date,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionRecord>

  abstract replaceSubmissionEvidences(
    submissionId: string,
    evidences: Array<Record<string, unknown>>,
    transaction: TaskTransaction
  ): Promise<void>

  abstract assignmentSnapshotExists(
    assignmentId: string,
    reason: string,
    transaction: TaskTransaction
  ): Promise<boolean>

  abstract listRequiredSkillSnapshots(
    taskId: string,
    transaction: TaskTransaction
  ): Promise<Record<string, unknown>[]>

  abstract createAssignmentSnapshot(
    payload: Record<string, unknown>,
    transaction: TaskTransaction
  ): Promise<Record<string, unknown>>

  abstract findSubmissionByTask(taskId: string): Promise<TaskSubmissionRecord | null>
  abstract findSubmissionById(submissionId: string): Promise<TaskSubmissionRecord | null>
  abstract lockSubmission(
    submissionId: string,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionRecord | null>
  abstract lockSubmissionStatus(
    submissionId: string,
    status: TaskSubmissionRecord['status'],
    now: Date,
    transaction: TaskTransaction
  ): Promise<TaskSubmissionRecord>

  abstract listSubmissionEvidences(
    submissionId: string
  ): Promise<Record<string, unknown>[]>
  abstract findSubmissionEvidence(
    evidenceId: string
  ): Promise<{ submission_id: string; uploaded_by: string } | null>
  abstract createSubmissionEvidence(
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>>
  abstract deleteSubmissionEvidence(evidenceId: string): Promise<void>

  abstract findAttachment(
    attachmentId: string
  ): Promise<{ task_id: string; uploaded_by: string } | null>
  abstract createAttachment(payload: Record<string, unknown>): Promise<Record<string, unknown>>
  abstract softDeleteAttachment(attachmentId: string, now: Date): Promise<void>
  abstract listAttachments(
    taskId: string,
    offset: number,
    limit: number
  ): Promise<{ total: number; rows: Record<string, unknown>[] }>

  abstract findComment(commentId: string, taskId?: string): Promise<TaskCommentRecord | null>
  abstract lockComment(
    commentId: string,
    transaction: TaskTransaction
  ): Promise<TaskCommentRecord | null>
  abstract findParentComment(
    parentCommentId: string,
    taskId: string,
    transaction: TaskTransaction
  ): Promise<TaskCommentRecord | null>
  abstract createComment(
    payload: Record<string, unknown>,
    transaction: TaskTransaction
  ): Promise<Record<string, unknown>>
  abstract updateComment(
    commentId: string,
    payload: Record<string, unknown>,
    transaction: TaskTransaction
  ): Promise<Record<string, unknown>>
  abstract softDeleteComment(commentId: string, now: Date): Promise<void>
  abstract listCommentThreadPage(
    taskId: string,
    offset: number,
    limit: number
  ): Promise<{ totalRootThreads: number; comments: Record<string, unknown>[] }>

  abstract findMentionedUsers(
    organizationId: string,
    usernames: string[],
    transaction?: TaskTransaction
  ): Promise<Array<{ id: string; username: string }>>
  abstract replaceCommentMentions(
    commentId: string,
    mentionedBy: string,
    mentions: Array<{ userId: string; token: string }>,
    transaction?: TaskTransaction
  ): Promise<void>
  abstract loadCommentMentions(
    commentIds: string[],
    transaction?: TaskTransaction
  ): Promise<Map<string, TaskMention[]>>
}
