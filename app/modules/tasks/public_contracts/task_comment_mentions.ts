export type TaskCommentMention = {
  userId: string
  username: string
  mentionToken: string
}

export {
  loadTaskCommentMentions,
  replaceTaskCommentMentions,
  resolveTaskCommentMentions,
} from '#modules/tasks/actions/support/task_comment_mentions'
