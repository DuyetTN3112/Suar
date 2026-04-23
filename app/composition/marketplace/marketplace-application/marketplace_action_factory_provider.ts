import type { ApplicationService } from '@adonisjs/core/types'

import { MarketplaceOrganizationAccessReaderAdapter } from '#composition/adapters/marketplace/marketplace_organization_access_reader_adapter'
import { MarketplacePublicTaskListingAdapter } from '#composition/adapters/marketplace/marketplace_public_task_listing_adapter'
import { MarketplaceSkillCatalogReaderAdapter } from '#composition/adapters/marketplace/marketplace_skill_catalog_reader_adapter'
import { ComposedMarketplaceActionFactory } from '#composition/factories/marketplace_action_factory'
import { TasksMarketplaceTaskApplicationAdapter } from '#composition/marketplace/marketplace-application/tasks_marketplace_task_application_adapter'

import { taskApplicationCapability } from '#composition/tasks/task-application/task_application_capability_composition'
import { makeGetPublicTasksQuery } from '#composition/tasks/task-search/tasks_search_composition'
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
