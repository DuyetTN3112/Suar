import { adonisLoggerSink } from '#modules/logger/infra/adapters/logger-runtime/adonis_logger_sink'
import { configureApplicationLogger } from '#modules/logger/public_contracts/application_logger'
import env from '#start/env'

export default class LoggerProvider {
  register(): void {
    configureApplicationLogger({
      logLevel: env.get('LOG_LEVEL'),
      sink: adonisLoggerSink,
    })
  }
}
