export class FilterSavedViewAccessError extends Error {
  readonly code = 'SAVED_FILTER_VIEW_UNAVAILABLE'

  constructor() {
    super('The Saved Filter View is unavailable.')
    this.name = 'FilterSavedViewAccessError'
  }
}

export type FilterSavedViewRepositoryErrorCode =
  | 'DUPLICATE_NAME'
  | 'DUPLICATE_DEFAULT'
  | 'OPTIMISTIC_CONFLICT'
  | 'CORRUPTED_PAYLOAD'
  | 'INVALID_PERSISTENCE_STATE'

export class FilterSavedViewRepositoryError extends Error {
  constructor(public readonly code: FilterSavedViewRepositoryErrorCode) {
    super('Saved Filter View persistence failed.')
    this.name = 'FilterSavedViewRepositoryError'
  }
}
