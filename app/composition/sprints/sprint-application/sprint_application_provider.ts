import type { ApplicationService } from '@adonisjs/core/types'

import {
  sprintCommandFactory,
  sprintQueryFactory,
  sprintReviewClosure,
} from '#composition/sprints/sprint-application/sprint_application_composition'

import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'
import { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'

export default class SprintApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(SprintCommandFactory, () => sprintCommandFactory)
    this.app.container.singleton(SprintQueryFactory, () => sprintQueryFactory)
    this.app.container.singleton(SprintReviewClosure, (): SprintReviewClosure => sprintReviewClosure)
  }
}
