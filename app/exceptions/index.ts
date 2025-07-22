/**
 * Exceptions Index
 *
 * Re-export tất cả custom exception classes.
 * Import alias: #exceptions/*
 *
 * @example
 * ```typescript
 * import {
 *   ForbiddenException,
 *   NotFoundException,
 *   UnauthorizedException,
 *   ValidationException,
 *   ConflictException,
 *   BusinessLogicException,
 *   RateLimitException
 * } from '#exceptions/index'
 * ```
 *
 * @module Exceptions
 */

export { default as ForbiddenException } from './forbidden_exception.js'
export { default as NotFoundException } from './not_found_exception.js'
export { default as UnauthorizedException } from './unauthorized_exception.js'
export { default as ValidationException } from './validation_exception.js'
export { default as ConflictException } from './conflict_exception.js'
export { default as BusinessLogicException } from './business_logic_exception.js'
export { default as RateLimitException } from './rate_limit_exception.js'
