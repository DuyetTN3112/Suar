import MoveTaskToSprintCommand from '#modules/sprints/actions/commands/task-sprint-assignment/move_task_to_sprint_command'
import ReorderProjectBacklogCommand from '#modules/sprints/actions/commands/project-backlog/reorder_project_backlog_command'
import CreateProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/create_project_sprint_command'
import EndProjectSprintDeliveryAndOpenReviewCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_and_open_review_command'
import EndProjectSprintDeliveryCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_command'
import StartProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/start_project_sprint_command'
import UpdateProjectSprintCommand from '#modules/sprints/actions/commands/project-sprint/update_project_sprint_command'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type {
  SprintRepository,
  SprintTransactionRunner,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export class ComposedSprintCommandFactory extends SprintCommandFactory {
  constructor(
    private readonly dependencies: SprintExternalDependencies,
    private readonly repository: SprintRepository,
    private readonly transactions: SprintTransactionRunner,
    readonly reviewClosure: SprintReviewClosure
  ) {
    super()
  }

  makeCreate(context: SprintActionContext): CreateProjectSprintCommand {
    return new CreateProjectSprintCommand(context, this.dependencies, this.repository)
  }

  makeMoveTask(context: SprintActionContext): MoveTaskToSprintCommand {
    return new MoveTaskToSprintCommand(
      context,
      this.dependencies,
      this.repository,
      this.transactions
    )
  }

  makeUpdate(context: SprintActionContext): UpdateProjectSprintCommand {
    return new UpdateProjectSprintCommand(
      context,
      this.dependencies,
      this.repository,
      this.transactions
    )
  }

  makeStart(context: SprintActionContext): StartProjectSprintCommand {
    return new StartProjectSprintCommand(context, this.dependencies, this.repository, this.transactions)
  }

  makeEndDelivery(context: SprintActionContext): EndProjectSprintDeliveryCommand {
    return new EndProjectSprintDeliveryCommand(context, this.dependencies, this.repository, this.transactions)
  }

  makeEndDeliveryAndOpenReview(context: SprintActionContext): EndProjectSprintDeliveryAndOpenReviewCommand {
    return new EndProjectSprintDeliveryAndOpenReviewCommand(
      context,
      this.makeEndDelivery(context),
      this.reviewClosure
    )
  }

  makeReorderBacklog(context: SprintActionContext): ReorderProjectBacklogCommand {
    return new ReorderProjectBacklogCommand(context, this.dependencies, this.repository, this.transactions)
  }
}
