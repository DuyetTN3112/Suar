/**
 * Route Constants
 *
 * Tập trung các route paths thường dùng trong ứng dụng.
 * Tránh hardcode route strings rải rác trong controllers và middleware.
 *
 * @module RouteConstants
 */

// ============================================================================
// Auth Routes
// ============================================================================

export const AuthRoutes = {
  LOGIN: '/login',
  LOGOUT: '/logout',
} as const

// ============================================================================
// Page Routes — Inertia page routes
// ============================================================================

export const PageRoutes = {
  HOME: '/',
  DASHBOARD: '/dashboard',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_ORGANIZATIONS: '/admin/organizations',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_REVIEWS: '/admin/reviews',

  // Organization Admin
  ORG: '/org',
  ORG_MEMBERS: '/org/members',
  ORG_INVITATIONS: '/org/invitations',
  ORG_REQUESTS: '/org/invitations/requests',
  ORG_PROJECTS: '/org/projects',
  ORG_WORKFLOW: '/org/workflow/statuses',

  // Organizations
  ORGANIZATIONS: '/organizations',
  ORGANIZATIONS_CREATE: '/organizations/create',

  // Projects
  PROJECTS: '/projects',

  // Tasks
  TASKS: '/tasks',
  TASKS_INDEX: '/tasks',

  // Conversations
  CONVERSATIONS: '/conversations',

  // Reviews
  REVIEWS: '/reviews',

  // Settings
  SETTINGS: '/settings',

  // Notifications
  NOTIFICATIONS: '/notifications',
} as const

// ============================================================================
// API Routes
// ============================================================================

export const ApiRoutes = {
  // Organizations
  ORGANIZATIONS: '/api/organizations',

  // Projects
  PROJECTS: '/api/projects',

  // Tasks
  TASKS: '/api/tasks',

  // Users
  USERS: '/api/users',

  // Notifications
  NOTIFICATIONS: '/api/notifications',

  // Conversations
  CONVERSATIONS: '/api/conversations',
} as const

// ============================================================================
// Error Page Routes
// ============================================================================

export const ErrorRoutes = {
  NOT_FOUND: '/errors/not-found',
  SERVER_ERROR: '/errors/server-error',
  FORBIDDEN: '/errors/forbidden',
  REQUIRE_ORGANIZATION: '/errors/require-organization',
} as const

// ============================================================================
// Inertia Page Components — dùng trong inertia.render()
// ============================================================================

export const InertiaPages = {
  // Errors
  ERROR_NOT_FOUND: 'errors/not_found',
  ERROR_SERVER_ERROR: 'errors/server_error',
  ERROR_FORBIDDEN: 'errors/forbidden',
  ERROR_REQUIRE_ORGANIZATION: 'errors/require_organization',
  ERROR_GENERIC: 'errors/error',
} as const
