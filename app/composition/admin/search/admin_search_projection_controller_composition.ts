import {
  applySearchIndexCleanupCommand,
  applySearchIndexRollbackCommand,
  inspectSearchIndicesQuery,
  previewSearchIndexCleanupQuery,
  previewSearchIndexRollbackQuery,
} from '#composition/search/index-administration/search_index_administration_composition'
import { authorizeSearchIndexOperatorQuery } from '#composition/search/index-administration/search_index_operator_composition'
import {
  applySearchIndexActivationCommand,
  previewSearchIndexActivationQuery,
  reconcileSearchProjectionGenerationCommand,
} from '#composition/search/projection-generation/search_projection_generation_composition'
import AdminSearchProjectionController from '#modules/http/controllers/search-discovery/admin_search_projection_controller'

export default class ComposedAdminSearchProjectionController extends AdminSearchProjectionController {
  constructor() {
    super({
      authorize: authorizeSearchIndexOperatorQuery,
      inspect: inspectSearchIndicesQuery,
      previewCleanup: previewSearchIndexCleanupQuery,
      applyCleanup: applySearchIndexCleanupCommand,
      previewRollback: previewSearchIndexRollbackQuery,
      applyRollback: applySearchIndexRollbackCommand,
      previewActivation: previewSearchIndexActivationQuery,
      applyActivation: applySearchIndexActivationCommand,
      reconcile: reconcileSearchProjectionGenerationCommand,
    })
  }
}
