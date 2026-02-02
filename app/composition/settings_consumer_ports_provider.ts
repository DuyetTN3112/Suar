import type { ApplicationService } from '@adonisjs/core/types'

import { UsersSettingsReaderWriterAdapter } from './adapters/users_settings_reader_writer_adapter.js'
import { ComposedSettingsActionFactory } from './factories/settings_action_factory.js'

import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'
import { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'

export default class SettingsConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const users = new UsersSettingsReaderWriterAdapter()

    this.app.container.singleton(SettingsUserReaderWriter, () => users)
    this.app.container.singleton(
      SettingsActionFactory,
      () => new ComposedSettingsActionFactory(users)
    )
  }
}
