import logger from '@adonisjs/core/services/logger'

import type { LoggerSink, LogLevel } from '#modules/logger/public_contracts/application_logger'

export class AdonisLoggerSink implements LoggerSink {
  error(message: string, ...args: unknown[]): void {
    writeConfiguredLog('error', message, args)
  }

  warn(message: string, ...args: unknown[]): void {
    writeConfiguredLog('warn', message, args)
  }

  info(message: string, ...args: unknown[]): void {
    writeConfiguredLog('info', message, args)
  }

  debug(message: string, ...args: unknown[]): void {
    writeConfiguredLog('debug', message, args)
  }

  trace(message: string, ...args: unknown[]): void {
    writeConfiguredLog('trace', message, args)
  }
}

export const adonisLoggerSink = new AdonisLoggerSink()

function writeConfiguredLog(level: LogLevel, message: string, args: unknown[]): void {
  const fields = buildLogFields(args)
  if (fields === null) {
    logger.log(level, message)
    return
  }

  logger.log(level, fields, message)
}

function buildLogFields(args: unknown[]): Record<string, unknown> | null {
  if (args.length === 0) return null
  if (args.length === 1 && isRecord(args[0])) return args[0]
  return { context: args.length === 1 ? args[0] : args }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
