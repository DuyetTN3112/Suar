export const FILTER_VALUES = {
  ALL: 'all',
} as const

export type FilterAllValue = (typeof FILTER_VALUES)[keyof typeof FILTER_VALUES]

export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES]
export type ApplicationFilterValue = ApplicationStatus | FilterAllValue

export const APPLICATION_FILTER_OPTIONS: readonly {
  value: ApplicationFilterValue
  label: string
}[] = [
  { value: FILTER_VALUES.ALL, label: 'Tất cả' },
  { value: APPLICATION_STATUSES.PENDING, label: 'Chờ duyệt' },
  { value: APPLICATION_STATUSES.APPROVED, label: 'Đã duyệt' },
  { value: APPLICATION_STATUSES.REJECTED, label: 'Từ chối' },
  { value: APPLICATION_STATUSES.WITHDRAWN, label: 'Đã rút' },
]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [APPLICATION_STATUSES.PENDING]: 'Chờ duyệt',
  [APPLICATION_STATUSES.APPROVED]: 'Đã duyệt',
  [APPLICATION_STATUSES.REJECTED]: 'Từ chối',
  [APPLICATION_STATUSES.WITHDRAWN]: 'Đã rút',
}

export const APPLICATION_STATUS_BADGE_VARIANTS: Record<
  ApplicationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [APPLICATION_STATUSES.APPROVED]: 'default',
  [APPLICATION_STATUSES.PENDING]: 'secondary',
  [APPLICATION_STATUSES.REJECTED]: 'destructive',
  [APPLICATION_STATUSES.WITHDRAWN]: 'outline',
}

export const MEMBERSHIP_STATUSES = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
} as const

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[keyof typeof MEMBERSHIP_STATUSES]

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  [MEMBERSHIP_STATUSES.APPROVED]: 'Đã duyệt',
  [MEMBERSHIP_STATUSES.PENDING]: 'Chờ duyệt',
  [MEMBERSHIP_STATUSES.REJECTED]: 'Từ chối',
}

export const MEMBERSHIP_STATUS_PILL_CLASSES: Record<MembershipStatus, string> = {
  [MEMBERSHIP_STATUSES.APPROVED]: 'neo-pill-blue',
  [MEMBERSHIP_STATUSES.PENDING]: 'neo-pill-orange',
  [MEMBERSHIP_STATUSES.REJECTED]: 'neo-pill-ink',
}
