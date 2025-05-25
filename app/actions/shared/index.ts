/**
 * Shared Action Infrastructure
 * Export all base classes, interfaces, and common DTOs
 */

// Base classes
export { BaseCommand } from './base_command.js'
export { BaseQuery } from './base_query.js'

// Interfaces
export type { CommandHandler, QueryHandler, Command, Query } from './interfaces.js'

// Result wrapper
export { Result } from './result.js'

// Common DTOs
export {
  PaginationDTO,
  PaginatedResult,
  OrganizationContextDTO,
  SortDTO,
  DateRangeDTO,
  SearchDTO,
  IdDTO,
} from './common_dtos.js'

export type { PaginationMeta } from './common_dtos.js'
