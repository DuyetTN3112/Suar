import type { ApplicationService } from '@adonisjs/core/types'

import { filteringActionFactory } from './filtering_composition.js'

import { FilteringActionFactory } from '#modules/filtering/actions/ports/inbound/filtering_action_factory'

export default class FilteringApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(FilteringActionFactory, () => filteringActionFactory)
  }
}
