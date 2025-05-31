/**
 * Common Constants
 *
 * Các constants dùng chung cho toàn bộ ứng dụng.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module CommonConstants
 */

/**
 * Trạng thái hoạt động chung
 */
export enum CommonState {
  DISABLED = 0,
  ENABLED = 1,
}

export const COMMON_STATES = [CommonState.DISABLED, CommonState.ENABLED] as const

export const commonStateOptions = [
  {
    label: 'Không hoạt động',
    value: CommonState.DISABLED,
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
  {
    label: 'Hoạt động',
    value: CommonState.ENABLED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#4caf50',
  },
]

/**
 * Lấy tên trạng thái theo giá trị
 */
export function getCommonStateName(state: CommonState): string {
  return commonStateOptions.find((option) => option.value === state)?.label ?? 'Unknown'
}

/**
 * Lấy style theo trạng thái
 */
export function getCommonStateStyle(state: CommonState): string {
  return commonStateOptions.find((option) => option.value === state)?.style ?? ''
}

/**
 * Visibility levels - Mức độ hiển thị
 */
export enum Visibility {
  PRIVATE = 'private',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

export const visibilityOptions = [
  {
    label: 'Riêng tư',
    value: Visibility.PRIVATE,
    description: 'Chỉ người tạo và người được mời mới có thể xem',
  },
  {
    label: 'Tổ chức',
    value: Visibility.ORGANIZATION,
    description: 'Tất cả thành viên trong tổ chức có thể xem',
  },
  {
    label: 'Công khai',
    value: Visibility.PUBLIC,
    description: 'Bất kỳ ai cũng có thể xem',
  },
]

export function getVisibilityLabel(visibility: Visibility): string {
  return visibilityOptions.find((option) => option.value === visibility)?.label ?? 'Unknown'
}

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: 20,
  MAX_PER_PAGE: 100,
} as const

/**
 * Cache TTL (seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const
