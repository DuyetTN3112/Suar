import type { ApplicationService } from '@adonisjs/core/types'

import { MarketplaceOrganizationAccessReaderAdapter } from './adapters/marketplace_organization_access_reader_adapter.js'
import { MarketplacePublicTaskListingAdapter } from './adapters/marketplace_public_task_listing_adapter.js'
import { MarketplaceSkillCatalogReaderAdapter } from './adapters/marketplace_skill_catalog_reader_adapter.js'
import { TasksMarketplaceTaskApplicationAdapter } from './adapters/tasks_marketplace_task_application_adapter.js'
import { ComposedMarketplaceActionFactory } from './factories/marketplace_action_factory.js'

import { taskApplicationCapability } from '#composition/task_application_capability_composition'
import { makeGetPublicTasksQuery } from '#composition/tasks_search_composition'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

export default class MarketplaceActionFactoryProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      MarketplaceActionFactory,
      () =>
        new ComposedMarketplaceActionFactory(
          new MarketplaceOrganizationAccessReaderAdapter(),
          new MarketplacePublicTaskListingAdapter(makeGetPublicTasksQuery),
          new MarketplaceSkillCatalogReaderAdapter(),
          new TasksMarketplaceTaskApplicationAdapter(taskApplicationCapability)
        )
    )
  }
}
