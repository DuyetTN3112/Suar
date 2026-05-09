import emitter from '@adonisjs/core/services/emitter'

import {
  handleOrganizationCreatedLifecycleLog,
  handleProjectCreatedLifecycleLog,
  type LifecycleLogListenerDependencies,
} from '#modules/logger/listeners/lifecycle_log_listener'
import loggerService from '#modules/logger/public_contracts/application_logger'

const dependencies: LifecycleLogListenerDependencies = {
  logger: loggerService,
}

emitter.on('organization:created', (event) =>
  handleOrganizationCreatedLifecycleLog(event, dependencies)
)
emitter.on('project:created', (event) => handleProjectCreatedLifecycleLog(event, dependencies))
