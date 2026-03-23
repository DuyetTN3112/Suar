/**
 * Process-wide application logging boundary with mandatory diagnostic sanitization.
 */
import {
  sanitizeErrorLogText,
  sanitizeLogValue,
} from '#modules/errors/public_contracts/error_sanitization'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace'
export type LoggerThreshold = LogLevel | 'silent'

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
}

export interface LoggerSink {
  error(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
  trace(message: string, ...args: unknown[]): void
}

export interface SanitizingLoggerOptions {
  logLevel?: LoggerThreshold
  sink?: LoggerSink
}

const silentLoggerSink: LoggerSink = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  trace: () => {},
}

export class SanitizingLogger {
  private currentLogLevel: LoggerThreshold
  private sink: LoggerSink

  constructor(options: SanitizingLoggerOptions = {}) {
    this.currentLogLevel = options.logLevel ?? 'info'
    this.sink = options.sink ?? silentLoggerSink
  }

  configure(options: Required<SanitizingLoggerOptions>): void {
    this.currentLogLevel = options.logLevel
    this.sink = options.sink
  }

  error(message: string, ...args: unknown[]): void {
    this.emit('error', message, args)
  }

  warn(message: string, ...args: unknown[]): void {
    this.emit('warn', message, args)
  }

  info(message: string, ...args: unknown[]): void {
    this.emit('info', message, args)
  }

  debug(message: string, ...args: unknown[]): void {
    this.emit('debug', message, args)
  }

  trace(message: string, ...args: unknown[]): void {
    this.emit('trace', message, args)
  }

  logStructured(level: LogLevel, eventName: string, payload: Record<string, unknown>): void {
    this.emit(level, eventName, [payload])
  }

  logObject(label: string, value: unknown, level: LogLevel = 'info'): void {
    if (!shouldLogLevel(level, this.currentLogLevel)) return

    try {
      const summary = summarizeLogObject(label, value)
      if (summary !== null) {
        this[level](summary)
      }
    } catch (error) {
      this.error(`Lỗi khi log object ${label}:`, error)
    }
  }

  private emit(level: LogLevel, message: string, args: unknown[]): void {
    if (!shouldLogLevel(level, this.currentLogLevel)) return

    const sanitizedMessage = sanitizeErrorLogText(message)
    try {
      this.sink[level](sanitizedMessage, ...args.map(sanitizeLogValue))
    } catch {
      // Telemetry is best-effort and must never change business transaction semantics.
    }
  }
}

const applicationLogger = new SanitizingLogger({ logLevel: 'silent', sink: silentLoggerSink })

export function configureApplicationLogger(options: Required<SanitizingLoggerOptions>): void {
  applicationLogger.configure(options)
}

export default applicationLogger

function shouldLogLevel(level: LogLevel, currentLogLevel: LoggerThreshold): boolean {
  if (currentLogLevel === 'silent') return false
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[currentLogLevel]
}

function summarizeLogObject(label: string, value: unknown): string | null {
  if (!value) {
    return `${label}: <null hoặc undefined>`
  }

  if (Array.isArray(value)) {
    return summarizeArray(label, value)
  }

  if (typeof value === 'object') {
    return summarizeRecord(label, value as Record<string, unknown>)
  }

  return summarizePrimitive(label, value)
}

function summarizeArray(label: string, items: unknown[]): string {
  const ids = items.map(readItemId).filter(Boolean)
  const idSummary = ids.length > 0 ? `, ID: ${ids.join(', ')}` : ''
  return `${label}: Mảng [${String(items.length)} phần tử]${idSummary}`
}

function readItemId(item: unknown): unknown {
  if (!item || typeof item !== 'object') return undefined

  const record = item as Record<string, unknown>
  return record['id'] ?? record['_id']
}

function summarizeRecord(label: string, value: Record<string, unknown>): string {
  const basicInfo = {
    id: value['id'] ?? value['_id'],
    name: value['name'] ?? value['title'] ?? value['label'],
    type: value.constructor.name,
  }
  return `${label}: ${JSON.stringify(basicInfo)}`
}

function summarizePrimitive(label: string, value: unknown): string | null {
  if (typeof value === 'string') return `${label}: ${value}`
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${label}: ${String(value)}`
  }
  if (typeof value === 'symbol') return `${label}: ${value.toString()}`
  if (typeof value === 'function') {
    return `${label}: [Function: ${value.name || 'anonymous'}]`
  }
  return null
}
