import type MoveTaskToSprintCommand from '#modules/sprints/actions/commands/task-sprint-assignment/move_task_to_sprint_command'
import type ReorderProjectBacklogCommand from '#modules/sprints/actions/commands/project-backlog/reorder_project_backlog_command'
import type CreateProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/create_project_sprint_command'
import type EndProjectSprintDeliveryAndOpenReviewCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_and_open_review_command'
import type EndProjectSprintDeliveryCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_command'
import type StartProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/start_project_sprint_command'
import type UpdateProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/update_project_sprint_command'
import type { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export abstract class SprintCommandFactory {
  abstract readonly reviewClosure: SprintReviewClosure
  abstract makeCreate(context: SprintActionContext): CreateProjectSprintCommand

  abstract makeMoveTask(context: SprintActionContext): MoveTaskToSprintCommand

  abstract makeUpdate(context: SprintActionContext): UpdateProjectSprintCommand

  abstract makeStart(context: SprintActionContext): StartProjectSprintCommand

  abstract makeEndDelivery(context: SprintActionContext): EndProjectSprintDeliveryCommand

  abstract makeEndDeliveryAndOpenReview(
    context: SprintActionContext
  ): EndProjectSprintDeliveryAndOpenReviewCommand

  abstract makeReorderBacklog(context: SprintActionContext): ReorderProjectBacklogCommand
}
