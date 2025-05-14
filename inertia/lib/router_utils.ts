import { router } from '@inertiajs/react'

/**

/**
 * Paths that should always trigger a full page reload
 * Typically authorization-related routes or routes that reset the application state
 */
export const HARD_RELOAD_PATHS = ['/logout', '/login', '/register']

/**
 * Check if a path requires a hard reload
 */
export function isHardReloadPath(path: string): boolean {
  return HARD_RELOAD_PATHS.some(
    (reloadPath) => path === reloadPath || path.startsWith(`${reloadPath}/`)
  )
}

/**
 * Optimized navigation helper that defaults to SPA behavior
 * but can fall back to hard reload for certain paths
 */
export function navigate(url: string, options: unknown = {}, event?: React.MouseEvent) {
  // Prevent default behavior if this is a click event
  if (event) {
    event.preventDefault()
  }
  // Use regular browser navigation for hard reload paths
  if (isHardReloadPath(url)) {
    window.location.href = url
    return
  }
  // Default options that improve SPA experience
  const spaOptions = {
    preserveScroll: true,
    preserveState: true,
    ...options,
  }
  // Use Inertia navigation
  router.visit(url, spaOptions)
}

/**
 * Create a form submission handler that preserves SPA experience
 */
export function createFormHandler(url: string, options: unknown = {}, callback?: () => void) {
  return (e: React.FormEvent) => {
    e.preventDefault()
    // Default options for form submissions
    const formOptions = {
      preserveScroll: true,
      ...options,
    }
    // Use regular browser navigation for hard reload paths
    if (isHardReloadPath(url)) {
      if (callback) callback()
      window.location.href = url
      return
    }
    // Use Inertia form submission
    router.post(url, {}, formOptions)
    // Execute callback if provided
    if (callback) callback()
  }
}
