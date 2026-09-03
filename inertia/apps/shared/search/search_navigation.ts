import { router } from '@inertiajs/svelte'

export interface SearchVisitOptions {
  preserveScroll?: boolean
  preserveState?: boolean
}

interface SearchRouter {
  visit: typeof router.visit
}

class StaleSearchResponseError extends Error {
  constructor() {
    super('A stale Search Center response was ignored')
    this.name = 'StaleSearchResponseError'
  }
}

export function createSearchNavigation(searchRouter: SearchRouter = router) {
  let cancelActiveSearchVisit: (() => void) | null = null
  let searchVisitSequence = 0

  return function visitSearch(url: string, options: SearchVisitOptions = {}) {
    const sequence = ++searchVisitSequence
    cancelActiveSearchVisit?.()

    let cancelVisit: (() => void) | null = null
    cancelActiveSearchVisit = () => cancelVisit?.()
    searchRouter.visit(url, {
      ...options,
      onCancelToken: (token) => {
        if (sequence !== searchVisitSequence) {
          token.cancel()
          return
        }
        cancelVisit = () => token.cancel()
      },
      onBeforeUpdate: () => {
        if (sequence !== searchVisitSequence) {
          throw new StaleSearchResponseError()
        }
      },
      onNetworkError: (error) => {
        if (error instanceof StaleSearchResponseError) {
          return false
        }
      },
      onFinish: () => {
        if (sequence === searchVisitSequence) {
          cancelVisit = null
          cancelActiveSearchVisit = null
        }
      },
    })
  }
}
