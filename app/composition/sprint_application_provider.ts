import type { ApplicationService } from '@adonisjs/core/types'

import {
  sprintCommandFactory,
  sprintQueryFactory,
} from './sprint_application_composition.js'

import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'

export default class SprintApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(SprintCommandFactory, () => sprintCommandFactory)
    this.app.container.singleton(SprintQueryFactory, () => sprintQueryFactory)
  }
}
