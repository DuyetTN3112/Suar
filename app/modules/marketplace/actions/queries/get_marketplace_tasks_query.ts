import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import {
  listPublicTasks,
  type PublicTaskListingInput,
  type PublicTaskListingResult,
} from '#modules/tasks/public_contracts/public_task_listing'


/**
 * Marketplace-owned facade for public task listing.
 *
 * Phase 1 keeps task read/storage behavior in the tasks module while moving route ownership
 * and page contracts into marketplace.
 */
export class GetMarketplaceTasksQuery {
  constructor(private readonly execCtx: HttpActionContext) {}

  public handle(input: PublicTaskListingInput): Promise<PublicTaskListingResult> {
    return listPublicTasks(input, this.execCtx)
  }
}
