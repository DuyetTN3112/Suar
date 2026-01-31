/**
 * Task Constants
 *
 * Constants liên quan đến Task, TaskApplication, TaskAssignment.
 * Pattern học từ ancarat-bo: enum + options array + helper function
 *
 * @module TaskConstants
 */

/**
 * Task Application Status
 * Trạng thái ứng tuyển task
 */
export enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export const applicationStatusOptions = [
  {
    label: 'Pending',
    labelVi: 'Chờ duyệt',
    value: ApplicationStatus.PENDING,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'Approved',
    labelVi: 'Đã duyệt',
    value: ApplicationStatus.APPROVED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Rejected',
    labelVi: 'Từ chối',
    value: ApplicationStatus.REJECTED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
  {
    label: 'Withdrawn',
    labelVi: 'Đã rút',
    value: ApplicationStatus.WITHDRAWN,
    style: 'bg-gray-100 text-gray-800 border-gray-200',
    color: '#6b7280',
  },
]

export function getApplicationStatusName(status: ApplicationStatus): string {
  return applicationStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

export function getApplicationStatusNameVi(status: ApplicationStatus): string {
  return (
    applicationStatusOptions.find((option) => option.value === status)?.labelVi ?? 'Không xác định'
  )
}

/**
 * Task Application Source
 * Nguồn ứng tuyển
 */
export enum ApplicationSource {
  PUBLIC_LISTING = 'public_listing',
  INVITATION = 'invitation',
  REFERRAL = 'referral',
}

export const applicationSourceOptions = [
  {
    label: 'Public Listing',
    labelVi: 'Tự tìm kiếm',
    value: ApplicationSource.PUBLIC_LISTING,
    description: 'Ứng viên tự tìm và ứng tuyển',
  },
  {
    label: 'Invitation',
    labelVi: 'Được mời',
    value: ApplicationSource.INVITATION,
    description: 'Được mời ứng tuyển',
  },
  {
    label: 'Referral',
    labelVi: 'Giới thiệu',
    value: ApplicationSource.REFERRAL,
    description: 'Được giới thiệu từ người khác',
  },
]

/**
 * Task Assignment Status
 * Trạng thái phân công task
 */
export enum AssignmentStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const assignmentStatusOptions = [
  {
    label: 'Active',
    labelVi: 'Đang thực hiện',
    value: AssignmentStatus.ACTIVE,
    style: 'bg-blue-100 text-blue-800 border-blue-200',
    color: '#3b82f6',
  },
  {
    label: 'Paused',
    labelVi: 'Tạm dừng',
    value: AssignmentStatus.PAUSED,
    style: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    color: '#f59e0b',
  },
  {
    label: 'Completed',
    labelVi: 'Hoàn thành',
    value: AssignmentStatus.COMPLETED,
    style: 'bg-green-100 text-green-800 border-green-200',
    color: '#22c55e',
  },
  {
    label: 'Cancelled',
    labelVi: 'Đã hủy',
    value: AssignmentStatus.CANCELLED,
    style: 'bg-red-100 text-red-800 border-red-200',
    color: '#ef4444',
  },
]

export function getAssignmentStatusName(status: AssignmentStatus): string {
  return assignmentStatusOptions.find((option) => option.value === status)?.label ?? 'Unknown'
}

/**
 * Task Assignment Type
 * Loại người được phân công
 */
export enum AssignmentType {
  MEMBER = 'member',
  FREELANCER = 'freelancer',
  VOLUNTEER = 'volunteer',
}

export const assignmentTypeOptions = [
  {
    label: 'Member',
    labelVi: 'Thành viên',
    value: AssignmentType.MEMBER,
    description: 'Thành viên trong tổ chức',
  },
  {
    label: 'Freelancer',
    labelVi: 'Freelancer',
    value: AssignmentType.FREELANCER,
    description: 'Freelancer bên ngoài',
  },
  {
    label: 'Volunteer',
    labelVi: 'Tình nguyện viên',
    value: AssignmentType.VOLUNTEER,
    description: 'Tình nguyện viên',
  },
]

/**
 * Task Listing Type
 * Loại công việc trên marketplace
 */
export enum TaskListingType {
  PRIVATE = 'private',
  PUBLIC = 'public',
  INVITATION_ONLY = 'invitation_only',
}

export const taskListingTypeOptions = [
  {
    label: 'Private',
    labelVi: 'Nội bộ',
    value: TaskListingType.PRIVATE,
    description: 'Chỉ dành cho thành viên trong tổ chức',
  },
  {
    label: 'Public',
    labelVi: 'Công khai',
    value: TaskListingType.PUBLIC,
    description: 'Hiển thị trên marketplace, ai cũng có thể ứng tuyển',
  },
  {
    label: 'Invitation Only',
    labelVi: 'Chỉ mời',
    value: TaskListingType.INVITATION_ONLY,
    description: 'Chỉ những người được mời mới có thể ứng tuyển',
  },
]
